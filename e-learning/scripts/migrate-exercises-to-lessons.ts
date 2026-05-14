import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "../config/db";
import {
  CourseChapterTable,
  ExercisesTable,
  LessonsTable,
} from "../config/schema";

type LegacyExercise = {
  name: string;
  slug: string;
  xp: number;
  difficulty?: "easy" | "medium" | "hard";
};

async function main() {
  console.log("Migrating courseChapters.exercises -> lessons …");

  const chapters = await db.select().from(CourseChapterTable);
  let migrated = 0;
  let skipped = 0;

  for (const chapter of chapters) {
    const { courseId, chapterId } = chapter;
    if (!courseId || !chapterId) {
      console.warn(`Skipping chapter id=${chapter.id} — missing courseId/chapterId`);
      continue;
    }

    const exercises = chapter.exercises;
    if (!Array.isArray(exercises) || exercises.length === 0) continue;

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i] as LegacyExercise;
      if (!ex?.slug || !ex?.name) continue;

      const existing = await db
        .select({ id: LessonsTable.id })
        .from(LessonsTable)
        .where(
          and(
            eq(LessonsTable.courseId, courseId),
            eq(LessonsTable.chapterId, chapterId),
            eq(LessonsTable.slug, ex.slug),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const [rich] = await db
        .select()
        .from(ExercisesTable)
        .where(
          and(
            eq(ExercisesTable.courseId, courseId),
            eq(ExercisesTable.chapterId, chapterId),
            eq(ExercisesTable.exerciseId, ex.slug),
          ),
        )
        .limit(1);

      const richContent = (rich?.exerciseContent ?? {}) as Record<string, unknown>;

      await db.insert(LessonsTable).values({
        courseId,
        chapterId,
        slug: ex.slug,
        orderIndex: i,
        type: "exercise",
        title: ex.name,
        xp: ex.xp ?? 0,
        content: {
          content: richContent.content ?? "",
          task: richContent.task ?? "",
          hint: richContent.hint ?? "",
          hintXp: richContent.hintXp ?? 0,
          starterCode: richContent.starterCode ?? {},
          regex: richContent.regex,
          expectedOutput: richContent.output,
          difficulty: ex.difficulty,
        },
      });
      migrated++;
    }
  }

  console.log(`Done. migrated=${migrated} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
