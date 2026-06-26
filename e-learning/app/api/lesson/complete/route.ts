import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/config/db";
import {
  CompletedLessonTable,
  CourseChapterTable,
  CoursesTable,
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
import { getAccessTier, hasProSubscription } from "@/lib/course-access";
import {
  detectGradingLanguage,
  gradeWithTestcases,
  supportsTestcaseGrading,
} from "@/lib/code-grading";

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

  // Defense finding (c) follow-up: the spec's "2.3.2 prerequisites"
  // require an enrolment row, but the original strict check blocked
  // valid completion paths the project actually relies on:
  //   - Pro subscribers don't enrol per-course (they bypass paywalls);
  //   - admins / instructors test their own courses without enrolling;
  //   - free-tier courses auto-enrol on first lesson view.
  // For those cases we now auto-create the enrolment row instead of
  // rejecting. Tier-locked courses (star / paid) still require a real
  // enrolment row for ordinary students — drive-by POSTs on those
  // continue to get a 403.
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
    const [me] = await db
      .select({ role: usersTable.role, subscription: usersTable.subscription })
      .from(usersTable)
      .where(eq(usersTable.email, userEmail))
      .limit(1);
    const [course] = await db
      .select({ level: CoursesTable.level })
      .from(CoursesTable)
      .where(eq(CoursesTable.courseId, lesson.courseId))
      .limit(1);

    const isPrivileged =
      me?.role === "admin" || me?.role === "instructor";
    const isPro = hasProSubscription(me?.subscription);
    const isFreeCourse = getAccessTier(course?.level) === "free";

    if (!isPrivileged && !isPro && !isFreeCourse) {
      return NextResponse.json(
        { error: "Not enrolled in this course" },
        { status: 403 },
      );
    }

    // Auto-enrol — same shape as POST /api/enroll-course. Uses the
    // no-target onConflictDoNothing so the call survives whether or
    // not the unique constraint migration has been applied.
    await db
      .insert(EnrolledCourseTable)
      .values({ userId, courseId: lesson.courseId, xpEarned: 0 })
      .onConflictDoNothing();
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
    const testcases = exerciseContent.testcases ?? [];

    // Test-case grading (C / C++ / Python). When the lesson has
    // test cases AND its starter code identifies one of the runnable
    // languages, the source-code regex / expectedOutput substring
    // checks are skipped — output-based grading is strictly stronger
    // and is what the spec's "kết quả mong đợi" should actually mean.
    // This is also what the API description in the report references
    // when it says "stdin/stdout test cases via Judge0".
    const gradingLanguage = detectGradingLanguage(exerciseContent.starterCode);
    if (testcases.length > 0 && gradingLanguage && supportsTestcaseGrading(gradingLanguage)) {
      const grade = await gradeWithTestcases({
        language: gradingLanguage,
        source: typeof submission === "string" ? submission : "",
        testcases,
      });
      if (grade.judgeNotConfigured) {
        return NextResponse.json(
          {
            error: "Code grading not configured",
            reason: "The instructor needs to wire JUDGE0_RAPIDAPI_KEY for this lesson.",
          },
          { status: 503 },
        );
      }
      if (!grade.pass) {
        return NextResponse.json(
          {
            error: "Submission did not pass all test cases",
            reason: `Passed ${grade.passedCases}/${grade.totalCases} test cases. Open the runner to see which ones failed.`,
            grading: grade,
          },
          { status: 422 },
        );
      }
      // Pass — fall through to XP credit.
    } else if (lessonRequiresValidation(exerciseContent)) {
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

  // Defense finding (b) follow-up: same reason as in /api/enroll-
  // course — the targeted `.onConflictDoNothing({ target: [...] })`
  // throws on Postgres unless the matching unique index is already
  // deployed. We SELECT-first to dedupe the common case (double-
  // click), then INSERT with no-target conflict handling so the
  // call survives whether or not the migration has been applied.
  const [preCompleted] = await db
    .select()
    .from(CompletedLessonTable)
    .where(
      and(
        eq(CompletedLessonTable.userId, userId),
        eq(CompletedLessonTable.lessonId, lessonId),
      ),
    )
    .limit(1);
  if (preCompleted) {
    return NextResponse.json({ alreadyCompleted: true, record: preCompleted });
  }

  const inserted = await db
    .insert(CompletedLessonTable)
    .values({
      userId,
      courseId: lesson.courseId,
      chapterId: lesson.chapterId,
      lessonId,
    })
    .onConflictDoNothing()
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
