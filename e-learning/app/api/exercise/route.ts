import { db } from "@/config/db";
import { CourseChapterTable } from "@/config/schema";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { ExercisesTable } from "@/config/schema";

export async function POST(req: NextRequest) {
  const { courseId, chapterId, exerciseId } = await req.json();

  console.log("Exercise API Request:", { courseId, chapterId, exerciseId });

  const courseResult = await db
    .select()
    .from(CourseChapterTable)
    .where(
      and(
        eq(CourseChapterTable.courseId, courseId),
        eq(CourseChapterTable.chapterId, chapterId),
      ),
    );

  console.log("Course Result:", courseResult);

  // Lấy exercise từ exercises JSON array trong chapter
  let exerciseData = undefined;

  if (courseResult[0]?.exercises && Array.isArray(courseResult[0].exercises)) {
    const foundExercise = courseResult[0].exercises.find(
      (ex: any) => ex.slug === exerciseId,
    );

    console.log("Found exercise from JSON:", foundExercise);
    console.log(
      "Found exercise keys:",
      foundExercise ? Object.keys(foundExercise) : "not found",
    );

    // Nếu ditemukan di JSON, coba cari di ExercisesTable bằng name
    let exerciseContent = foundExercise?.content || {};

    if (
      foundExercise &&
      (!exerciseContent || Object.keys(exerciseContent).length === 0)
    ) {
      // Coba query ExercisesTable bằng exerciseName
      const dbExerciseResult = await db
        .select()
        .from(ExercisesTable)
        .where(eq(ExercisesTable.exerciseName, foundExercise.name));

      console.log("DB Exercise by name:", dbExerciseResult);

      if (dbExerciseResult.length > 0) {
        exerciseContent = dbExerciseResult[0].exerciseContent || {};
      }
    }

    if (foundExercise) {
      exerciseData = {
        courseId: courseId,
        chapterId: chapterId,
        exerciseName: foundExercise.name,
        exerciseId: foundExercise.slug,
        exerciseContent: exerciseContent || {
          content: foundExercise.description || "",
          task: foundExercise.task || "",
          hint: foundExercise.hint || "",
          starterCode: foundExercise.starterCode || "",
          hintXp: foundExercise.hintXp || "",
        },
      };
    }
  }

  console.log("Final exerciseData:", exerciseData);

  const response = {
    ...courseResult[0],
    exerciseData: exerciseData,
  };

  console.log("Final Response exerciseData:", response.exerciseData);

  return NextResponse.json(response);
}
