import "dotenv/config";
import { and, eq, max } from "drizzle-orm";
import { db } from "../config/db";
import {
  CourseChapterTable,
  CoursesTable,
  LessonsTable,
} from "../config/schema";

// Adds a single demo course with one of each lesson type (video, pdf,
// exercise) so the multi-modal playground has something to render.
// Idempotent: re-running won't create duplicates — it looks up the demo
// course by title and skips lessons whose slug already exists.

const DEMO_TITLE = "Demo: Multi-Modal Lessons";
const DEMO_DESC =
  "Sample course with one video, one PDF, and one exercise to demonstrate the LMS flow.";
const DEMO_BANNER =
  "https://res.cloudinary.com/dxsoyupfv/image/upload/v1700000000/sample.jpg";

async function findOrCreateCourse(): Promise<number> {
  const existing = await db
    .select()
    .from(CoursesTable)
    .where(eq(CoursesTable.title, DEMO_TITLE))
    .limit(1);
  if (existing.length > 0) {
    console.log(`Found existing demo course (courseId=${existing[0].courseId})`);
    return existing[0].courseId;
  }

  const [{ value: currentMax }] = await db
    .select({ value: max(CoursesTable.courseId) })
    .from(CoursesTable);
  const courseId = (currentMax ?? 0) + 1;

  await db.insert(CoursesTable).values({
    courseId,
    title: DEMO_TITLE,
    desc: DEMO_DESC,
    bannerImage: DEMO_BANNER,
    level: "beginner",
    tags: "demo,multimodal",
    editorType: "static",
    unlockCost: 0,
  });
  console.log(`Created demo course (courseId=${courseId})`);
  return courseId;
}

async function findOrCreateChapter(courseId: number): Promise<number> {
  const existing = await db
    .select()
    .from(CourseChapterTable)
    .where(eq(CourseChapterTable.courseId, courseId))
    .limit(1);
  if (existing.length > 0) {
    console.log(`Found existing chapter (chapterId=${existing[0].chapterId})`);
    return existing[0].chapterId!;
  }

  const chapterId = 1;
  await db.insert(CourseChapterTable).values({
    courseId,
    chapterId,
    name: "Walkthrough",
    desc: "Watch the video, read the PDF, then solve the exercise.",
  });
  console.log(`Created chapter #${chapterId}`);
  return chapterId;
}

async function insertLessonIfMissing(
  courseId: number,
  chapterId: number,
  slug: string,
  payload: {
    orderIndex: number;
    type: "video" | "pdf" | "exercise";
    title: string;
    xp: number;
    content: Record<string, unknown>;
  },
) {
  const existing = await db
    .select({ id: LessonsTable.id })
    .from(LessonsTable)
    .where(
      and(
        eq(LessonsTable.courseId, courseId),
        eq(LessonsTable.chapterId, chapterId),
        eq(LessonsTable.slug, slug),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    console.log(`  Skipped (already exists): ${slug}`);
    return;
  }
  await db.insert(LessonsTable).values({
    courseId,
    chapterId,
    slug,
    ...payload,
  });
  console.log(`  Inserted: ${slug}`);
}

async function main() {
  const courseId = await findOrCreateCourse();
  const chapterId = await findOrCreateChapter(courseId);

  console.log("Seeding lessons:");

  // 1. Video lesson — a public freeCodeCamp talk on YouTube. Replace with
  // your own URL once you have one.
  await insertLessonIfMissing(courseId, chapterId, "demo-video-intro", {
    orderIndex: 0,
    type: "video",
    title: "Demo: Intro Video",
    xp: 10,
    content: {
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=qz0aGYrrlhU",
    },
  });

  // 2. PDF lesson — Mozilla's public "Introduction to HTML" PDF. Any
  // direct-PDF URL works.
  await insertLessonIfMissing(courseId, chapterId, "demo-pdf-reading", {
    orderIndex: 1,
    type: "pdf",
    title: "Demo: Reading Material",
    xp: 10,
    content: {
      pdfUrl:
        "https://www.w3.org/WAI/WCAG21/working-examples/pdf-tagged/tagged.pdf",
    },
  });

  // 3. Exercise lesson — single-file HTML with a regex check. Mirrors the
  // shape produced by the admin form for type=exercise.
  await insertLessonIfMissing(courseId, chapterId, "demo-exercise-title", {
    orderIndex: 2,
    type: "exercise",
    title: "Demo: Add a Title Tag",
    xp: 20,
    content: {
      content:
        "<p>Welcome to the demo exercise. Your job is to give this HTML document a title.</p>",
      task: "<p>Inside <code>&lt;head&gt;</code>, add <code>&lt;title&gt;Hello World&lt;/title&gt;</code>.</p>",
      hint: "<p>The title tag goes between <code>&lt;head&gt;</code> and <code>&lt;/head&gt;</code>.</p>",
      hintXp: 5,
      starterCode: {
        "/index.html":
          '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <title></title>\n  </head>\n  <body>\n    <h1>Demo</h1>\n  </body>\n</html>\n',
      },
      regex: "(?i)<title>\\s*Hello World\\s*</title>",
      expectedOutput: "<title>Hello World</title>",
      difficulty: "easy",
    },
  });

  console.log("Done. Visit /admin/courses to find the demo course, or");
  console.log(`/courses/${courseId} as a student to try the flow.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
