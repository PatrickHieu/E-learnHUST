import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import { CompletedExerciseTable, CourseChapterTable, CoursesTable, EnrolledCourseTable} from "@/config/schema";
import { eq, asc, desc } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const user = await currentUser();

  if (courseId) {
    const result = await db
      .select()
      .from(CoursesTable)
      .where(eq(CoursesTable.courseId, Number(courseId)));
    
    const chapterResult = await db.select().from(CourseChapterTable)
      .where(eq(CourseChapterTable.courseId, Number(courseId)));
    
    const enrolledCourse = await db
      .select()
      .from(EnrolledCourseTable)
      //@ts-ignore
      .where(and(eq(EnrolledCourseTable?.courseId, courseId), eq(EnrolledCourseTable?.userId, user?.primaryEmailAddress?.emailAddress)
      ));
    
    const isEnrolledCourse=enrolledCourse?.length>0?true:false

    const completeExercises = await db.select().from(CompletedExerciseTable)
      //@ts-ignore
      .where(and(eq(CompletedExerciseTable.courseId, courseId), eq(CompletedExerciseTable.userId, user?.primaryEmailAddress?.emailAddress)
      ))
      .orderBy(desc(CompletedExerciseTable?.courseId),
        desc(CompletedExerciseTable?.exerciseId)
      );

    return NextResponse.json({
      ...result[0],
      chapters: chapterResult,
      userEnrolled: isEnrolledCourse,
      courseEnrolledInfo: enrolledCourse[0],
      completedExercises: completeExercises
    });
  } else {
    //fetch all courses from the database
    const result = await db.select().from(CoursesTable);

    console.log("Kết quả từ DB:", result);
    return NextResponse.json(result);
  }
}
