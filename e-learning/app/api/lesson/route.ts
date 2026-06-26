import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/config/db";
import {
  CompletedLessonTable,
  CompletedVideoQuizTable,
  CourseChapterTable,
  CoursesTable,
  LessonsTable,
} from "@/config/schema";
import { isChapterUnlocked, isLessonGating } from "@/lib/chapter-gating";

// Returns a single lesson plus sibling-lesson navigation metadata for the
// student playground.
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { courseId, chapterId, slug } = await req.json();

  if (
    typeof courseId !== "number" ||
    typeof chapterId !== "number" ||
    typeof slug !== "string" ||
    !slug
  ) {
    return NextResponse.json(
      { error: "courseId and chapterId must be numbers; slug must be a non-empty string" },
      { status: 400 },
    );
  }

  const [lesson] = await db
    .select()
    .from(LessonsTable)
    .where(
      and(
        eq(LessonsTable.courseId, courseId),
        eq(LessonsTable.chapterId, chapterId),
        eq(LessonsTable.slug, slug),
      ),
    )
    .limit(1);

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Chapter gate: block lesson access when an earlier chapter still has
  // gating lessons the student hasn't completed. We pull the minimum
  // needed — every chapter in the course + its gating lessons + the
  // user's completedLesson IDs for the course — and run the same helper
  // the chapter listing UI uses.
  const allChapters = await db
    .select({
      chapterId: CourseChapterTable.chapterId,
      id: CourseChapterTable.id,
    })
    .from(CourseChapterTable)
    .where(eq(CourseChapterTable.courseId, courseId))
    .orderBy(asc(CourseChapterTable.chapterId));

  const allLessonsForGating = await db
    .select({
      id: LessonsTable.id,
      chapterId: LessonsTable.chapterId,
      type: LessonsTable.type,
      content: LessonsTable.content,
    })
    .from(LessonsTable)
    .where(eq(LessonsTable.courseId, courseId));

  const allCompletedForCourse = await db
    .select({ lessonId: CompletedLessonTable.lessonId })
    .from(CompletedLessonTable)
    .where(
      and(
        eq(CompletedLessonTable.userId, userId),
        eq(CompletedLessonTable.courseId, courseId),
      ),
    );

  const chaptersForGating = allChapters.map((ch) => ({
    lessons: allLessonsForGating
      .filter((l) => l.chapterId === ch.chapterId)
      .map((l) => ({
        id: l.id,
        gating: isLessonGating({ type: l.type, content: l.content }),
      })),
  }));

  const requestedChapterIndex = allChapters.findIndex(
    (ch) => ch.chapterId === chapterId,
  );
  if (
    requestedChapterIndex >= 0 &&
    !isChapterUnlocked(
      chaptersForGating,
      requestedChapterIndex,
      allCompletedForCourse.map((c) => c.lessonId),
    )
  ) {
    return NextResponse.json(
      {
        error: "Chapter locked",
        reason: "Complete the previous chapter's quizzes and exercises first.",
      },
      { status: 403 },
    );
  }

  const [chapter] = await db
    .select()
    .from(CourseChapterTable)
    .where(
      and(
        eq(CourseChapterTable.courseId, courseId),
        eq(CourseChapterTable.chapterId, chapterId),
      ),
    )
    .limit(1);

  const siblings = await db
    .select({
      id: LessonsTable.id,
      slug: LessonsTable.slug,
      title: LessonsTable.title,
      type: LessonsTable.type,
      orderIndex: LessonsTable.orderIndex,
      xp: LessonsTable.xp,
    })
    .from(LessonsTable)
    .where(
      and(
        eq(LessonsTable.courseId, courseId),
        eq(LessonsTable.chapterId, chapterId),
      ),
    )
    .orderBy(asc(LessonsTable.orderIndex));

  // Return every completed lesson in the COURSE (not just the current
  // chapter). The sidebar uses this list both to render the green
  // checks AND to feed isChapterUnlocked() — scoping it to the current
  // chapter made previously finished chapters appear locked the
  // moment the student navigated into a later chapter, because the
  // gating helper couldn't see the completions that unlocked them.
  const completed = await db
    .select({ lessonId: CompletedLessonTable.lessonId })
    .from(CompletedLessonTable)
    .where(
      and(
        eq(CompletedLessonTable.userId, userId),
        eq(CompletedLessonTable.courseId, courseId),
      ),
    );

  const [course] = await db
    .select({ editorType: CoursesTable.editorType })
    .from(CoursesTable)
    .where(eq(CoursesTable.courseId, courseId))
    .limit(1);

  // For video lessons with in-video quiz checkpoints we also surface which
  // checkpoint indexes the student has already answered, so the player
  // doesn't make them repeat them after a reload.
  let completedCheckpointIndexes: number[] = [];
  if (lesson.type === "video") {
    const completedCheckpoints = await db
      .select({ checkpointIndex: CompletedVideoQuizTable.checkpointIndex })
      .from(CompletedVideoQuizTable)
      .where(
        and(
          eq(CompletedVideoQuizTable.userId, userId),
          eq(CompletedVideoQuizTable.lessonId, lesson.id),
        ),
      );
    completedCheckpointIndexes = completedCheckpoints.map((c) => c.checkpointIndex);
  }

  return NextResponse.json({
    chapter,
    lesson,
    siblings,
    completedLessonIds: completed.map((c) => c.lessonId),
    completedCheckpointIndexes,
    editorType: course?.editorType ?? null,
  });
}
