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

  // Defense finding (b): unique constraint on (userId, courseId)
  // means insert wins exactly once across racing requests. Only the
  // winner runs the deduction afterwards — guarantees no double-
  // charge from concurrent clicks.
  const inserted = await db
    .insert(EnrolledCourseTable)
    .values({ userId, courseId, xpEarned: 0 })
    .onConflictDoNothing({
      target: [EnrolledCourseTable.userId, EnrolledCourseTable.courseId],
    })
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
