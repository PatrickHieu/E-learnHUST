import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/config/db";
import {
  CompletedLessonTable,
  EnrolledCourseTable,
  LessonsTable,
  usersTable,
  type ExerciseLessonContent,
  type QuizLessonContent,
} from "@/config/schema";
import {
  lessonRequiresValidation,
  validateExerciseSubmission,
  validateQuizSubmission,
} from "@/lib/lesson-validation";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  if (!userId || !userEmail) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { lessonId, submission } = await req.json();

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

  // Exercise + quiz lessons re-validate server-side; video / pdf auto-pass.
  // Client check is convenience only — it can be bypassed.
  if (lesson.type === "exercise") {
    const exerciseContent = lesson.content as ExerciseLessonContent;
    if (lessonRequiresValidation(exerciseContent)) {
      const result = validateExerciseSubmission(
        exerciseContent,
        typeof submission === "string" ? submission : "",
      );
      if (!result.pass) {
        return NextResponse.json(
          { error: "Submission did not pass validation", reason: result.reason },
          { status: 422 },
        );
      }
    }
  } else if (lesson.type === "quiz") {
    const quizContent = lesson.content as QuizLessonContent;
    const result = validateQuizSubmission(
      quizContent,
      typeof submission === "string" ? submission : "",
    );
    if (!result.pass) {
      return NextResponse.json(
        { error: "Submission did not pass validation", reason: result.reason },
        { status: 422 },
      );
    }
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

  // Stars are tracked in two columns:
  // - points: spendable balance (consumed by intermediate unlocks)
  // - lifetimePoints: total ever earned, never decremented
  // The leaderboard ranks by lifetimePoints so a learner doesn't drop
  // in the rankings just because they spent stars to unlock a course.
  await db
    .update(usersTable)
    .set({
      points: sql`${usersTable.points} + ${xpEarned}`,
      lifetimePoints: sql`${usersTable.lifetimePoints} + ${xpEarned}`,
    })
    .where(eq(usersTable.email, userEmail));

  return NextResponse.json({ record, xpEarned });
}
