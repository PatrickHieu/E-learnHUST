import { db } from "@/config/db";
import { CoursesTable, EnrolledCourseTable, usersTable } from "@/config/schema";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  const userId = user?.id;
  const userEmail = user?.primaryEmailAddress?.emailAddress;

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

  // Idempotency: if the user is already enrolled in this course, return the
  // existing row instead of creating a duplicate enrollment. We do this
  // before any star deduction so a double-click never charges twice.
  const existing = await db
    .select()
    .from(EnrolledCourseTable)
    .where(
      and(
        eq(EnrolledCourseTable.userId, userId),
        eq(EnrolledCourseTable.courseId, courseId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ alreadyEnrolled: true, record: existing[0] });
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

  // For paid courses: atomic check-and-deduct. The conditional WHERE means
  // the row only updates if the user actually has enough stars — no
  // transaction needed (neon-http doesn't support them) and no race window
  // where two concurrent enrollments could both succeed on insufficient
  // balance.
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
      return NextResponse.json(
        {
          error: "Insufficient stars",
          reason: `This course costs ${unlockCost} ⭐ — you don't have enough yet.`,
        },
        { status: 402 },
      );
    }
  }

  const [record] = await db
    .insert(EnrolledCourseTable)
    .values({
      courseId,
      userId,
      xpEarned: 0,
    })
    .returning();

  return NextResponse.json({ record, starsSpent: unlockCost });
}
