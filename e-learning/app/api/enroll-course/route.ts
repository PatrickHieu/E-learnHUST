import { db } from "@/config/db";
import { EnrolledCourseTable } from "@/config/schema";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  if (!userEmail) {
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
  // existing row instead of creating a duplicate enrollment.
  const existing = await db
    .select()
    .from(EnrolledCourseTable)
    .where(
      and(
        eq(EnrolledCourseTable.userId, userEmail),
        eq(EnrolledCourseTable.courseId, courseId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ alreadyEnrolled: true, record: existing[0] });
  }

  const [record] = await db
    .insert(EnrolledCourseTable)
    .values({
      courseId,
      userId: userEmail,
      xpEarned: 0,
    })
    .returning();

  return NextResponse.json({ record });
}
