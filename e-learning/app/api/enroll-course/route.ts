import { db } from "@/config/db";
import { CoursesTable, EnrolledCourseTable, usersTable } from "@/config/schema";
import { auth } from "@/auth";
import { and, eq, gte, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  if (!userId || !userEmail) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { courseId } = await req.json();

  if (typeof courseId !== "number") {
    return NextResponse.json(
      { error: "courseId must be a number" },
      { status: 400 },
    );
  }

  const [course] = await db
    .select({ unlockCost: CoursesTable.unlockCost })
    .from(CoursesTable)
    .where(eq(CoursesTable.courseId, courseId))
    .limit(1);

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const unlockCost = course.unlockCost ?? 0;

  // Defense finding (b) follow-up: previously this used
  // `.onConflictDoNothing({ target: [userId, courseId] })`, which
  // throws on Postgres unless the matching unique constraint is
  // already deployed. If the operator hadn't run `drizzle-kit push`
  // yet (the script that creates the constraint), every enrol POST
  // 500'd — that was the "không enroll được" symptom.
  //
  // New shape: explicit SELECT-first for the common (already-
  // enrolled) case, then `.onConflictDoNothing()` with no target so
  // the call is safe whether or not the constraint exists. Without
  // the constraint the race-safety degrades to "best effort dedupe"
  // but the basic flow always works.
  const preExisting = await db
    .select()
    .from(EnrolledCourseTable)
    .where(
      and(
        eq(EnrolledCourseTable.userId, userId),
        eq(EnrolledCourseTable.courseId, courseId),
      ),
    )
    .limit(1);
  if (preExisting.length > 0) {
    return NextResponse.json({ alreadyEnrolled: true, record: preExisting[0] });
  }

  const inserted = await db
    .insert(EnrolledCourseTable)
    .values({ userId, courseId, xpEarned: 0 })
    .onConflictDoNothing()
    .returning();

  if (inserted.length === 0) {
    const [existing] = await db
      .select()
      .from(EnrolledCourseTable)
      .where(
        and(
          eq(EnrolledCourseTable.userId, userId),
          eq(EnrolledCourseTable.courseId, courseId),
        ),
      )
      .limit(1);
    return NextResponse.json({ alreadyEnrolled: true, record: existing });
  }

  if (unlockCost > 0) {
    const deducted = await db
      .update(usersTable)
      .set({ points: sql`${usersTable.points} - ${unlockCost}` })
      .where(
        and(
          eq(usersTable.email, userEmail),
          gte(usersTable.points, unlockCost),
        ),
      )
      .returning({ points: usersTable.points });

    if (deducted.length === 0) {
      // Roll the enrolment back so we don't gift a paid course on a
      // depleted balance.
      await db
        .delete(EnrolledCourseTable)
        .where(
          and(
            eq(EnrolledCourseTable.userId, userId),
            eq(EnrolledCourseTable.courseId, courseId),
          ),
        );
      return NextResponse.json(
        {
          error: "Insufficient stars",
          reason: `This course costs ${unlockCost} ⭐ — you don't have enough yet.`,
        },
        { status: 402 },
      );
    }
  }

  return NextResponse.json({ record: inserted[0], starsSpent: unlockCost });
}
