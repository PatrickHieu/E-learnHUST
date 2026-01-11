import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import { CourseChapterTable, CoursesTable } from "@/config/schema";
import { eq, asc, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");

  if (courseId) {
    const result = await db
      .select()
      .from(CoursesTable)
      .where(eq(CoursesTable.courseId, Number(courseId)));
    
    const chapterResult = await db.select().from(CourseChapterTable)
      .where(eq(CourseChapterTable.courseId, Number(courseId)));
    
    return NextResponse.json(
      {
        ...result[0],
        chapters: chapterResult,
      },
    );
  } else {
    //fetch all courses from the database
    const result = await db.select().from(CoursesTable);

    console.log("Kết quả từ DB:", result);
    return NextResponse.json(result);
  }
}
