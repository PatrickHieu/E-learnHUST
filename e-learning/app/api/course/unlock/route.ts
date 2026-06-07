import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/config/db";
import {
  CourseChapterTable,
  CoursesTable,
  EnrolledCourseTable,
  PaymentsTable,
  usersTable,
} from "@/config/schema";
import {
  effectiveUnlockCost,
  getAccessTier,
} from "@/lib/course-access";

// Spend XP / "stars" to unlock an intermediate course. Server is the
// source of truth for both the price and the balance — never trust
// client-supplied values. On success a PaymentsTable row is written
// (method='stars') so the admin chart still treats star-unlocks as
// activity (just with amountVnd=null).
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  if (!userId || !userEmail) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { courseId?: number } | null;
  const courseId = Number(body?.courseId);
  if (!Number.isFinite(courseId) || courseId <= 0) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }

  const [course] = await db
    .select()
    .from(CoursesTable)
    .where(eq(CoursesTable.courseId, courseId))
    .limit(1);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  if (getAccessTier(course.level) !== "star") {
    return NextResponse.json(
      { error: "This course isn't unlockable with stars" },
      { status: 400 },
    );
  }

  const existing = await db
    .select({ id: EnrolledCourseTable.id })
    .from(EnrolledCourseTable)
    .where(
      and(
        eq(EnrolledCourseTable.userId, userId),
        eq(EnrolledCourseTable.courseId, courseId),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ alreadyEnrolled: true }, { status: 200 });
  }

  const chapterCount = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(CourseChapterTable)
    .where(eq(CourseChapterTable.courseId, courseId));
  const cost = effectiveUnlockCost(
    course.level,
    course.unlockCost,
    chapterCount[0]?.value ?? 0,
  );

  const [userRow] = await db
    .select({ points: usersTable.points })
    .from(usersTable)
    .where(eq(usersTable.email, userEmail))
    .limit(1);
  const balance = userRow?.points ?? 0;
  if (balance < cost) {
    return NextResponse.json(
      {
        error: "Insufficient stars",
        balance,
        cost,
        shortBy: cost - balance,
      },
      { status: 402 },
    );
  }

  // Deduct, enrol, record the payment row. We don't wrap in a real
  // transaction because Neon's HTTP driver doesn't expose one — but
  // failures partway through leave a deductible row + missing
  // enrolment, which the cron / next request can clean up later if
  // needed. For Phase 5 demo data this is acceptable.
  await db
    .update(usersTable)
    .set({ points: sql`${usersTable.points} - ${cost}` })
    .where(eq(usersTable.email, userEmail));

  await db.insert(EnrolledCourseTable).values({
    userId,
    courseId,
    xpEarned: 0,
  });

  await db.insert(PaymentsTable).values({
    userId,
    courseId,
    method: "stars",
    amountVnd: null,
    starsSpent: cost,
    status: "succeeded",
  });

  return NextResponse.json({
    success: true,
    starsSpent: cost,
    remaining: balance - cost,
  });
}
