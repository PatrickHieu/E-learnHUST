import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import {
  CompletedExerciseTable,
  CourseChapterTable,
  CoursesTable,
  EnrolledCourseTable,
} from "@/config/schema";
import { eq, asc, desc, inArray, and } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId") || searchParams.get("courseid");
  const user = await currentUser();

  const userEmail = user?.primaryEmailAddress?.emailAddress;

  if (!userEmail) {
    return NextResponse.json(
      { error: "User not authenticated" },
      { status: 401 },
    );
  }

  if (courseId && courseId !== "enrolled") {
    const result = await db
      .select()
      .from(CoursesTable)
      .where(eq(CoursesTable.courseId, Number(courseId)));

    const chapterResult = await db
      .select()
      .from(CourseChapterTable)
      .where(eq(CourseChapterTable.courseId, Number(courseId)));

    const enrolledCourse = await db
      .select()
      .from(EnrolledCourseTable)
      //@ts-ignore
      .where(and(eq(EnrolledCourseTable?.courseId, courseId),
          eq(
            EnrolledCourseTable?.userId,
            user?.primaryEmailAddress?.emailAddress,
          ),
        ),
      );

    const isEnrolledCourse = enrolledCourse?.length > 0 ? true : false;

    const completeExercises = await db
      .select()
      .from(CompletedExerciseTable)
      //@ts-ignore
      .where( and(eq(CompletedExerciseTable.courseId, courseId),
          eq(
            CompletedExerciseTable.userId,
            user?.primaryEmailAddress?.emailAddress,
          ),
        ),
      )
      .orderBy(
        desc(CompletedExerciseTable?.courseId),
        desc(CompletedExerciseTable?.exerciseId),
      );

    return NextResponse.json({
      ...result[0],
      chapters: chapterResult,
      userEnrolled: isEnrolledCourse,
      courseEnrolledInfo: enrolledCourse[0],
      completedExercises: completeExercises,
    });
  } else if (courseId === "enrolled") {
    // 1️⃣ Fetch all enrolled courses for the user
    const enrolledCourses = await db
      .select()
      .from(EnrolledCourseTable)
      .where(eq(EnrolledCourseTable.userId, userEmail));

    if (enrolledCourses.length === 0) {
      return NextResponse.json([]);
    }

    // Extract courseIds
    const courseIds = enrolledCourses.map((c) => c.courseId);

    // 2️⃣ Fetch all course details in one go
    const courses = await db
      .select()
      .from(CoursesTable)
      //@ts-ignore
      .where(inArray(CoursesTable.courseId, courseIds));

    // 3️⃣ Fetch chapters for all courses
    const chapters = await db
      .select()
      .from(CourseChapterTable)
      //@ts-ignore
      .where(inArray(CourseChapterTable.courseId, courseIds))
      .orderBy(asc(CourseChapterTable.chapterId));

    // 4️⃣ Fetch completed exercises for all courses
    const completed = await db
      .select()
      .from(CompletedExerciseTable)
      //@ts-ignore
      .where(and(inArray(CompletedExerciseTable.courseId, courseIds),
          eq(CompletedExerciseTable.userId, userEmail),
        ),
      )
      .orderBy(
        desc(CompletedExerciseTable.courseId),
        desc(CompletedExerciseTable.exerciseId),
      );

    const finalResult = courses.map((course) => {
      const courseEnrollInfo = enrolledCourses.find(
        (e) => e.courseId === course.courseId,
      );

      return {
        ...course,
        chapters: chapters.filter((ch) => ch.courseId === course.courseId),
        completedExercises: completed.filter(
          (cx) => cx.courseId === course.courseId,
        ),
        courseEnrolledInfo: courseEnrollInfo,
        userEnrolled: true,
      };
    });

    // ⭐ Format output
    const formattedResult = finalResult.map((item) => {
      // Count total exercises by summing exercises arrays in all chapters
      const totalExercises = item.chapters.reduce((acc, chapter) => {
        // If exercises is stored as JSON/array
        const exercisesCount = Array.isArray(chapter.exercises)
          ? chapter.exercises.length
          : 0;
        return acc + exercisesCount;
      }, 0);

      const completedExercises = item.completedExercises.length;

      return {
        courseId: item.courseId,
        title: item.title,
        bannerImage: item?.bannerImage,
        totalExercises,
        completedExercises,
        xpEarned: item.courseEnrolledInfo?.xpEarned || 0,
        level: item.level,
      };
    });

    return NextResponse.json(formattedResult);
  } else {
    //fetch all courses from the database
    const result = await db.select().from(CoursesTable);

    console.log("Kết quả từ DB:", result);
    return NextResponse.json(result);
  }
}
