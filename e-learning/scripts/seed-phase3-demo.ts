import "dotenv/config";
import { and, eq, max } from "drizzle-orm";
import { db } from "../config/db";
import {
  CourseChapterTable,
  CoursesTable,
  LessonsTable,
} from "../config/schema";

// Seeds the "HTML Foundations" Phase 3 demo course — 1 chapter, 4 lessons
// (video, pdf, exercise, quiz). Idempotent: looks up the course by title
// and skips lessons whose (courseId, chapterId, slug) already exists, so
// re-running won't produce duplicates.
//
// See docs/PHASE3_DEMO_CONTENT.md for the source materials (video script,
// PDF markdown source). Swap the URL placeholders below with your real
// recorded video and uploaded PDF before showing the demo.

const COURSE_TITLE = "HTML Foundations";
const COURSE_DESC =
  "Learn the structure of an HTML document and build your first web page from scratch.";
const COURSE_BANNER =
  "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1400&q=80";

// REPLACE WITH YOUR RECORDED LOOM/YOUTUBE URL ↓
const VIDEO_URL_PLACEHOLDER =
  "https://www.youtube.com/watch?v=qz0aGYrrlhU";
const VIDEO_PROVIDER: "youtube" | "vimeo" | "native" = "youtube";

// REPLACE WITH YOUR UPLOADED CLOUDINARY PDF URL ↓
const PDF_URL_PLACEHOLDER =
  "https://www.w3.org/WAI/WCAG21/working-examples/pdf-tagged/tagged.pdf";

async function findOrCreateCourse(): Promise<number> {
  const existing = await db
    .select()
    .from(CoursesTable)
    .where(eq(CoursesTable.title, COURSE_TITLE))
    .limit(1);
  if (existing.length > 0) {
    console.log(`Found existing course (courseId=${existing[0].courseId})`);
    return existing[0].courseId;
  }

  const [{ value: currentMax }] = await db
    .select({ value: max(CoursesTable.courseId) })
    .from(CoursesTable);
  const courseId = (currentMax ?? 0) + 1;

  await db.insert(CoursesTable).values({
    courseId,
    title: COURSE_TITLE,
    desc: COURSE_DESC,
    bannerImage: COURSE_BANNER,
    level: "beginner",
    tags: "html,web,beginner",
    editorType: "static",
    unlockCost: 0,
  });
  console.log(`Created course "${COURSE_TITLE}" (courseId=${courseId})`);
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
    name: "Your First HTML Page",
    desc: "What HTML is, what every page has in common, and how to write a working one.",
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
    type: "video" | "pdf" | "exercise" | "quiz";
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
  await db.insert(LessonsTable).values({ courseId, chapterId, slug, ...payload });
  console.log(`  Inserted: ${slug}`);
}

const EXERCISE_CONTENT_HTML = `<p>You've watched how HTML pages are structured and you've got the cheatsheet. Now it's your turn. Write a complete HTML page that introduces yourself.</p>
<p>The page needs to have:</p>
<ol>
  <li>The DOCTYPE declaration at the top</li>
  <li>An <code>&lt;html&gt;</code> element wrapping everything</li>
  <li>A <code>&lt;head&gt;</code> containing a <code>&lt;title&gt;</code> of <strong>My First Page</strong></li>
  <li>A <code>&lt;body&gt;</code> containing an <code>&lt;h1&gt;</code> with the text <strong>Hello, world!</strong></li>
</ol>`;

const EXERCISE_TASK_HTML = `<p>Edit the starter code on the right so the rendered page has the title <strong>My First Page</strong> and an <code>&lt;h1&gt;</code> heading reading <strong>Hello, world!</strong>. Click <strong>Run Code</strong> to preview, then <strong>Mark Completed!</strong> when it matches.</p>`;

const EXERCISE_HINT_HTML = `<p>The structure goes:</p>
<pre><code>&lt;head&gt;&lt;title&gt;...&lt;/title&gt;&lt;/head&gt;
&lt;body&gt;&lt;h1&gt;...&lt;/h1&gt;&lt;/body&gt;</code></pre>
<p>The title text must read exactly <em>My First Page</em> and the heading text must read exactly <em>Hello, world!</em>. Watch capitalisation and punctuation — the validator is case-sensitive on the comma.</p>`;

const EXERCISE_STARTER_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title></title>
  </head>
  <body>
  </body>
</html>
`;

async function main() {
  const courseId = await findOrCreateCourse();
  const chapterId = await findOrCreateChapter(courseId);

  console.log("Seeding lessons:");

  // 1. Video — replace VIDEO_URL_PLACEHOLDER once you record your Loom.
  await insertLessonIfMissing(courseId, chapterId, "what-is-html", {
    orderIndex: 0,
    type: "video",
    title: "What is HTML?",
    xp: 10,
    content: {
      provider: VIDEO_PROVIDER,
      url: VIDEO_URL_PLACEHOLDER,
    },
  });

  // 2. PDF — replace PDF_URL_PLACEHOLDER once you've generated and
  // uploaded the cheatsheet.
  await insertLessonIfMissing(courseId, chapterId, "html-quick-reference", {
    orderIndex: 1,
    type: "pdf",
    title: "HTML Quick Reference",
    xp: 10,
    content: { pdfUrl: PDF_URL_PLACEHOLDER },
  });

  // 3. Exercise — fully self-contained, ready to use.
  await insertLessonIfMissing(courseId, chapterId, "build-the-web-skeleton", {
    orderIndex: 2,
    type: "exercise",
    title: "Build the Web Skeleton",
    xp: 20,
    content: {
      content: EXERCISE_CONTENT_HTML,
      task: EXERCISE_TASK_HTML,
      hint: EXERCISE_HINT_HTML,
      hintXp: 5,
      starterCode: { "/index.html": EXERCISE_STARTER_HTML },
      regex:
        "(?i)<title>\\s*My First Page\\s*</title>[\\s\\S]*<h1>\\s*Hello, world!\\s*</h1>",
      difficulty: "easy",
    },
  });

  // 4. Quiz — fully self-contained.
  await insertLessonIfMissing(courseId, chapterId, "html-quick-check", {
    orderIndex: 3,
    type: "quiz",
    title: "HTML Quick Check",
    xp: 15,
    content: {
      question:
        "<p>Which element holds information that the user does <strong>NOT</strong> see on the page (like the title that appears on the browser tab and the character encoding)?</p>",
      options: ["<body>", "<head>", "<meta>", "<html>"],
      correctIndex: 1,
      explanation:
        "<p>The <code>&lt;head&gt;</code> element holds metadata — the title that shows on the browser tab, the character encoding, links to stylesheets and scripts. Visible content goes in <code>&lt;body&gt;</code>. <code>&lt;meta&gt;</code> lives <em>inside</em> <code>&lt;head&gt;</code> and describes one specific piece of metadata; <code>&lt;html&gt;</code> wraps everything.</p>",
    },
  });

  console.log("\nDone.");
  console.log(`Visit /admin/courses to manage, or /courses/${courseId} as a student.`);
  console.log("See docs/PHASE3_DEMO_CONTENT.md for the recording + PDF source.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
