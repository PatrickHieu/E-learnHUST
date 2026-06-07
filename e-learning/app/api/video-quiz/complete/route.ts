import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/config/db";
import {
  CompletedLessonTable,
  CompletedVideoQuizTable,
  EnrolledCourseTable,
  LessonsTable,
  usersTable,
  type VideoLessonContent,
  type VideoQuizCheckpoint,
} from "@/config/schema";
import { validateQuizSubmission } from "@/lib/lesson-validation";

// Marks one in-video quiz checkpoint complete for the current user.
// Idempotent on (userId, lessonId, checkpointIndex). When the user has
// completed every checkpoint in the video, the parent video lesson is
// also marked complete (a row lands in completedLesson) so the existing
// progress UI doesn't need to special-case videos with checkpoints.
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  if (!userId || !userEmail) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { lessonId, checkpointIndex, submission } = await req.json();

  if (typeof lessonId !== "number") {
    return NextResponse.json(
      { error: "lessonId must be a number" },
      { status: 400 },
    );
  }
  if (typeof checkpointIndex !== "number" || !Number.isInteger(checkpointIndex) || checkpointIndex < 0) {
    return NextResponse.json(
      { error: "checkpointIndex must be a non-negative integer" },
      { status: 400 },
    );
  }

  const [lesson] = await db
    .select()
    .from(LessonsTable)
    .where(eq(LessonsTable.id, lessonId))
    .limit(1);

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }
  if (lesson.type !== "video") {
    return NextResponse.json(
      { error: "Lesson is not a video" },
      { status: 400 },
    );
  }

  const videoContent = lesson.content as VideoLessonContent;
  const checkpoints = (videoContent.inVideoQuizzes ?? []) as VideoQuizCheckpoint[];
  const checkpoint = checkpoints[checkpointIndex];
  if (!checkpoint) {
    return NextResponse.json(
      { error: "Checkpoint not found at that index" },
      { status: 404 },
    );
  }

  // Re-use the standalone-quiz validator. Submission is the picked index
  // as a string (same wire format as /api/lesson/complete for quiz lessons).
  const result = validateQuizSubmission(
    {
      question: checkpoint.question,
      options: checkpoint.options,
      correctIndex: checkpoint.correctIndex,
    },
    typeof submission === "string" ? submission : "",
  );
  if (!result.pass) {
    return NextResponse.json(
      { error: "Wrong answer", reason: result.reason },
      { status: 422 },
    );
  }

  // Idempotency on this specific checkpoint — student can hit the same
  // timestamp again and we won't double-credit XP.
  const existing = await db
    .select()
    .from(CompletedVideoQuizTable)
    .where(
      and(
        eq(CompletedVideoQuizTable.userId, userId),
        eq(CompletedVideoQuizTable.lessonId, lessonId),
        eq(CompletedVideoQuizTable.checkpointIndex, checkpointIndex),
      ),
    )
    .limit(1);

  let lessonCompleted = false;

  if (existing.length === 0) {
    await db.insert(CompletedVideoQuizTable).values({
      userId,
      courseId: lesson.courseId,
      chapterId: lesson.chapterId,
      lessonId,
      checkpointIndex,
    });

    const xpEarned = checkpoint.xp ?? 0;
    if (xpEarned > 0) {
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
    }
  }

  // Check whether every checkpoint in this video now has a completion
  // row for this user. If yes, also mark the parent lesson complete (so
  // CourseChapter's green badge + progress bar work without extra logic).
  const [{ value: completedCount }] = await db
    .select({ value: count() })
    .from(CompletedVideoQuizTable)
    .where(
      and(
        eq(CompletedVideoQuizTable.userId, userId),
        eq(CompletedVideoQuizTable.lessonId, lessonId),
      ),
    );

  if (completedCount >= checkpoints.length) {
    const lessonAlreadyCompleted = await db
      .select({ id: CompletedLessonTable.id })
      .from(CompletedLessonTable)
      .where(
        and(
          eq(CompletedLessonTable.userId, userId),
          eq(CompletedLessonTable.lessonId, lessonId),
        ),
      )
      .limit(1);

    if (lessonAlreadyCompleted.length === 0) {
      await db.insert(CompletedLessonTable).values({
        userId,
        courseId: lesson.courseId,
        chapterId: lesson.chapterId,
        lessonId,
      });
      lessonCompleted = true;
    }
  }

  return NextResponse.json({
    checkpointXp: existing.length === 0 ? checkpoint.xp ?? 0 : 0,
    alreadyCompleted: existing.length > 0,
    lessonCompleted,
    totalCheckpoints: checkpoints.length,
    completedCheckpoints: Number(completedCount),
  });
}
