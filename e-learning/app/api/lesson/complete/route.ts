import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/config/db";
import {
  CompletedLessonTable,
  EnrolledCourseTable,
  LessonsTable,
  usersTable,
} from "@/config/schema";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  const userId = user?.id;
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  if (!userId || !userEmail) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { lessonId } = await req.json();

  if (typeof lessonId !== "number") {
    return NextResponse.json(
      { error: "lessonId must be a number" },
      { status: 400 },
    );
  }

  // Canonical XP comes from the lessons table — the client doesn't get to
  // decide how much it's worth.
  const [lesson] = await db
    .select()
    .from(LessonsTable)
    .where(eq(LessonsTable.id, lessonId))
    .limit(1);

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const xpEarned = lesson.xp ?? 0;

  const existing = await db
    .select()
    .from(CompletedLessonTable)
    .where(
      and(
        eq(CompletedLessonTable.userId, userId),
        eq(CompletedLessonTable.lessonId, lessonId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ alreadyCompleted: true, record: existing[0] });
  }

  const [record] = await db
    .insert(CompletedLessonTable)
    .values({
      userId,
      courseId: lesson.courseId,
      chapterId: lesson.chapterId,
      lessonId,
    })
    .returning();

  await db
    .update(EnrolledCourseTable)
    .set({ xpEarned: sql`${EnrolledCourseTable.xpEarned} + ${xpEarned}` })
    .where(
      and(
        eq(EnrolledCourseTable.courseId, lesson.courseId),
        eq(EnrolledCourseTable.userId, userId),
      ),
    );

  await db
    .update(usersTable)
    .set({ points: sql`${usersTable.points} + ${xpEarned}` })
    .where(eq(usersTable.email, userEmail));

  return NextResponse.json({ record, xpEarned });
}
