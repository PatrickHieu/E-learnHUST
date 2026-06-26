import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { and, eq } from "drizzle-orm";
import { db } from "@/config/db";
import {
  CoursesTable,
  EnrolledCourseTable,
  PaymentsTable,
} from "@/config/schema";
import {
  effectivePriceVnd,
  getAccessTier,
} from "@/lib/course-access";

// Mock checkout for advanced courses. Records the payment row +
// enrolment as if a real provider succeeded. When VNPay / MoMo /
// Stripe land later, this route is what flips to a 'pending' insert
// + redirect to the provider, with the webhook moving status to
// 'succeeded' before enrolment.
const ACCEPTED_METHODS = new Set(["vnpay", "momo", "card"] as const);

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { courseId?: number; method?: string }
    | null;
  const courseId = Number(body?.courseId);
  const method = String(body?.method ?? "").toLowerCase();
  if (!Number.isFinite(courseId) || courseId <= 0) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }
  if (!ACCEPTED_METHODS.has(method as typeof ACCEPTED_METHODS extends Set<infer T> ? T : never)) {
    return NextResponse.json(
      { error: "method must be one of: vnpay, momo, card" },
      { status: 400 },
    );
  }

  const [course] = await db
    .select()
    .from(CoursesTable)
    .where(eq(CoursesTable.courseId, courseId))
    .limit(1);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  if (getAccessTier(course.level) !== "paid") {
    return NextResponse.json(
      { error: "This course isn't a paid course" },
      { status: 400 },
    );
  }

  // Server is the source of truth for the price; ignore any client
  // value to prevent a tampered "I paid 1.000₫" replay.
  const amountVnd = effectivePriceVnd(course.level, course.priceVnd, course.courseId);

  // Race-safety (finding b) + compat: SELECT-first dedupe so the
  // route works whether or not the (userId, courseId) unique
  // constraint has been pushed to the DB. We then use a no-target
  // onConflictDoNothing as the secondary safety net for the race
  // case when the constraint *is* present.
  const preExisting = await db
    .select({ id: EnrolledCourseTable.id })
    .from(EnrolledCourseTable)
    .where(
      and(
        eq(EnrolledCourseTable.userId, userId),
        eq(EnrolledCourseTable.courseId, courseId),
      ),
    )
    .limit(1);
  if (preExisting.length > 0) {
    return NextResponse.json({ alreadyEnrolled: true }, { status: 200 });
  }

  const inserted = await db
    .insert(EnrolledCourseTable)
    .values({ userId, courseId, xpEarned: 0 })
    .onConflictDoNothing()
    .returning();

  if (inserted.length === 0) {
    return NextResponse.json({ alreadyEnrolled: true }, { status: 200 });
  }

  await db.insert(PaymentsTable).values({
    userId,
    courseId,
    method: `mock_${method}`,
    amountVnd,
    starsSpent: null,
    status: "succeeded",
  });

  return NextResponse.json({
    success: true,
    amountVnd,
    method,
  });
}
