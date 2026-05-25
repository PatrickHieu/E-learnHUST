import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import {
  CompletedLessonTable,
  CourseChapterTable,
  CoursesTable,
  EnrolledCourseTable,
  LessonsTable,
} from "@/config/schema";
import { eq, asc, inArray, and } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawCourseId = searchParams.get("courseId") || searchParams.get("courseid");
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "User not authenticated" },
      { status: 401 },
    );
  }

  // Single-course detail
  if (rawCourseId && rawCourseId !== "enrolled") {
    const courseIdNum = Number(rawCourseId);
    if (!Number.isFinite(courseIdNum)) {
      return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
    }

    const [course] = await db
      .select()
      .from(CoursesTable)
      .where(eq(CoursesTable.courseId, courseIdNum))
      .limit(1);

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const chapterRows = await db
      .select()
      .from(CourseChapterTable)
      .where(eq(CourseChapterTable.courseId, courseIdNum))
      .orderBy(asc(CourseChapterTable.chapterId));

    const lessonRows = await db
      .select({
        id: LessonsTable.id,
        courseId: LessonsTable.courseId,
        chapterId: LessonsTable.chapterId,
        slug: LessonsTable.slug,
        orderIndex: LessonsTable.orderIndex,
        type: LessonsTable.type,
        title: LessonsTable.title,
        xp: LessonsTable.xp,
      })
      .from(LessonsTable)
      .where(eq(LessonsTable.courseId, courseIdNum))
      .orderBy(asc(LessonsTable.chapterId), asc(LessonsTable.orderIndex));

    const enrolledCourse = await db
      .select()
      .from(EnrolledCourseTable)
      .where(
        and(
          eq(EnrolledCourseTable.courseId, courseIdNum),
          eq(EnrolledCourseTable.userId, userId),
        ),
      )
      .limit(1);

    const completed = await db
      .select({ lessonId: CompletedLessonTable.lessonId })
      .from(CompletedLessonTable)
      .where(
        and(
          eq(CompletedLessonTable.courseId, courseIdNum),
          eq(CompletedLessonTable.userId, userId),
        ),
      );

    const chapters = chapterRows.map((ch) => ({
      ...ch,
      lessons: lessonRows.filter((l) => l.chapterId === ch.chapterId),
    }));

    return NextResponse.json({
      ...course,
      chapters,
      userEnrolled: enrolledCourse.length > 0,
      courseEnrolledInfo: enrolledCourse[0],
      completedLessonIds: completed.map((c) => c.lessonId),
    });
  }

  // Dashboard: enrolled-course summary cards
  if (rawCourseId === "enrolled") {
    const enrolledCourses = await db
      .select()
      .from(EnrolledCourseTable)
      .where(eq(EnrolledCourseTable.userId, userId));

    if (enrolledCourses.length === 0) {
      return NextResponse.json([]);
    }

    const courseIds = enrolledCourses
      .map((c) => c.courseId)
      .filter((id): id is number => typeof id === "number");

    const courses = await db
      .select()
      .from(CoursesTable)
      .where(inArray(CoursesTable.courseId, courseIds));

    const lessonsByCourse = await db
      .select({ courseId: LessonsTable.courseId })
      .from(LessonsTable)
      .where(inArray(LessonsTable.courseId, courseIds));

    const completedByCourse = await db
      .select({ courseId: CompletedLessonTable.courseId })
      .from(CompletedLessonTable)
      .where(
        and(
          inArray(CompletedLessonTable.courseId, courseIds),
          eq(CompletedLessonTable.userId, userId),
        ),
      );

    const totalsByCourse = new Map<number, number>();
    for (const l of lessonsByCourse) {
      totalsByCourse.set(l.courseId, (totalsByCourse.get(l.courseId) ?? 0) + 1);
    }
    const completedCountByCourse = new Map<number, number>();
    for (const c of completedByCourse) {
      completedCountByCourse.set(
        c.courseId,
        (completedCountByCourse.get(c.courseId) ?? 0) + 1,
      );
    }

    const result = courses.map((course) => {
      const enrollment = enrolledCourses.find((e) => e.courseId === course.courseId);
      return {
        courseId: course.courseId,
        title: course.title,
        bannerImage: course.bannerImage,
        totalLessons: totalsByCourse.get(course.courseId) ?? 0,
        completedLessons: completedCountByCourse.get(course.courseId) ?? 0,
        xpEarned: enrollment?.xpEarned ?? 0,
        level: course.level,
      };
    });

    return NextResponse.json(result);
  }

  // Default: list all courses
  const result = await db.select().from(CoursesTable);
  return NextResponse.json(result);
}
