import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/config/db";
import {
  CompletedLessonTable,
  CourseChapterTable,
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
import { isChapterUnlocked, isLessonGating } from "@/lib/chapter-gating";

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

  // Defense finding (c): the spec's "2.3.2 prerequisites" require the
  // learner to actually be enrolled in the course AND the chapter to
  // be unlocked. The Mark Completed UI never lets you in without
  // those, but a raw POST could — so check both server-side here.
  const [enrolment] = await db
    .select({ id: EnrolledCourseTable.id })
    .from(EnrolledCourseTable)
    .where(
      and(
        eq(EnrolledCourseTable.userId, userId),
        eq(EnrolledCourseTable.courseId, lesson.courseId),
      ),
    )
    .limit(1);
  if (!enrolment) {
    return NextResponse.json(
      { error: "Not enrolled in this course" },
      { status: 403 },
    );
  }

  // Chapter-gate check uses the same helper the client renders the
  // sidebar locks with, so the rule stays in lock-step.
  const allChapters = await db
    .select({ chapterId: CourseChapterTable.chapterId })
    .from(CourseChapterTable)
    .where(eq(CourseChapterTable.courseId, lesson.courseId))
    .orderBy(asc(CourseChapterTable.chapterId));
  const allLessons = await db
    .select({
      id: LessonsTable.id,
      chapterId: LessonsTable.chapterId,
      type: LessonsTable.type,
      content: LessonsTable.content,
    })
    .from(LessonsTable)
    .where(eq(LessonsTable.courseId, lesson.courseId));
  const completedSoFar = await db
    .select({ lessonId: CompletedLessonTable.lessonId })
    .from(CompletedLessonTable)
    .where(
      and(
        eq(CompletedLessonTable.userId, userId),
        eq(CompletedLessonTable.courseId, lesson.courseId),
      ),
    );

  const chaptersForGate = allChapters.map((ch) => ({
    lessons: allLessons
      .filter((l) => l.chapterId === ch.chapterId)
      .map((l) => ({ id: l.id, gating: isLessonGating({ type: l.type, content: l.content }) })),
  }));
  const requestedIdx = allChapters.findIndex((ch) => ch.chapterId === lesson.chapterId);
  if (
    requestedIdx >= 0 &&
    !isChapterUnlocked(
      chaptersForGate,
      requestedIdx,
      completedSoFar.map((c) => c.lessonId),
    )
  ) {
    return NextResponse.json(
      { error: "Chapter locked", reason: "Complete the previous chapter first." },
      { status: 403 },
    );
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
        // Finding (a): malformed regex now surfaces as a 422 with a
        // dedicated code so the client can tell "your answer is
        // wrong" from "this lesson has a broken validator". No XP is
        // credited in either case.
        if (result.code === "LESSON_MISCONFIGURED") {
          console.error(
            `[lesson-misconfigured] lesson #${lesson.id} regex won't compile: ${exerciseContent.regex}`,
          );
          return NextResponse.json(
            { error: "Lesson is misconfigured", code: result.code, reason: result.reason },
            { status: 422 },
          );
        }
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

  // Defense finding (b): collapse SELECT-then-INSERT into an atomic
  // INSERT … ON CONFLICT DO NOTHING. The unique constraint on
  // (userId, lessonId) means a race can never double-credit XP —
  // exactly one row inserts; the other request's insert is a no-op
  // and we treat it as alreadyCompleted.
  const inserted = await db
    .insert(CompletedLessonTable)
    .values({
      userId,
      courseId: lesson.courseId,
      chapterId: lesson.chapterId,
      lessonId,
    })
    .onConflictDoNothing({
      target: [CompletedLessonTable.userId, CompletedLessonTable.lessonId],
    })
    .returning();

  if (inserted.length === 0) {
    // The race lost. Either an earlier request already credited the
    // XP or the user double-clicked. Don't credit again — just
    // surface the existing row.
    const [existing] = await db
      .select()
      .from(CompletedLessonTable)
      .where(
        and(
          eq(CompletedLessonTable.userId, userId),
          eq(CompletedLessonTable.lessonId, lessonId),
        ),
      )
      .limit(1);
    return NextResponse.json({ alreadyCompleted: true, record: existing });
  }

  const record = inserted[0];

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
