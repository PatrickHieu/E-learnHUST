import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/config/db";
import {
  CompletedLessonTable,
  CourseChapterTable,
  CoursesTable,
  LessonsTable,
} from "@/config/schema";

// Returns a single lesson plus sibling-lesson navigation metadata for the
// student playground.
export async function POST(req: NextRequest) {
  const user = await currentUser();
  const userId = user?.id;

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

  const completed = await db
    .select({ lessonId: CompletedLessonTable.lessonId })
    .from(CompletedLessonTable)
    .where(
      and(
        eq(CompletedLessonTable.userId, userId),
        eq(CompletedLessonTable.courseId, courseId),
        eq(CompletedLessonTable.chapterId, chapterId),
      ),
    );

  const [course] = await db
    .select({ editorType: CoursesTable.editorType })
    .from(CoursesTable)
    .where(eq(CoursesTable.courseId, courseId))
    .limit(1);

  return NextResponse.json({
    chapter,
    lesson,
    siblings,
    completedLessonIds: completed.map((c) => c.lessonId),
    editorType: course?.editorType ?? null,
  });
}
