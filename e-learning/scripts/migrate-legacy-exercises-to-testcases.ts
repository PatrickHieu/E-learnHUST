import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "../config/db";
import {
  CoursesTable,
  LessonsTable,
  type ExerciseLessonContent,
  type ExerciseTestCase,
} from "../config/schema";

// Migrates the legacy regex / expectedOutput exercises in the C++ and
// Python demo courses to proper stdin/stdout test-case grading. The
// original lessons (seed-language-demos.ts) were authored before the
// test-case mechanism existed and use substring matches against the
// source code — exactly the weakness the defense reviewer flagged.
//
// Each patch:
//   1. Drops `regex` and `expectedOutput` (they were source-string
//      checks, not output checks).
//   2. Adds a `testcases` array. Some cases hidden so the answer can't
//      be reverse-engineered from the page.
//
// Idempotent. If a lesson already has `testcases` populated, the
// patch is skipped — re-running after a manual edit won't clobber it.
//
// Run:  npm run migrate:legacy-to-testcases

type Patch = {
  courseTitle: string;
  slug: string;
  testcases: ExerciseTestCase[];
  note: string;
};

const PATCHES: Patch[] = [
  // ── C++ Foundations ────────────────────────────────────────────
  {
    courseTitle: "C++ Foundations",
    slug: "cpp-hello",
    note: "Hello world — print the literal greeting",
    testcases: [
      { name: "no input", input: "", expectedOutput: "Hello, world!\n" },
    ],
  },
  {
    courseTitle: "C++ Foundations",
    slug: "cpp-sum",
    note: "Read a and b, print their sum",
    testcases: [
      { name: "small positives", input: "3 4\n", expectedOutput: "7\n" },
      { name: "with zero", input: "0 10\n", expectedOutput: "10\n" },
      { name: "negatives", input: "-5 -7\n", expectedOutput: "-12\n", hidden: true },
    ],
  },
  {
    courseTitle: "C++ Foundations",
    slug: "cpp-multiplication",
    note: "Print 10 lines of the 5x multiplication table",
    testcases: [
      {
        name: "exact 10 lines",
        input: "",
        expectedOutput:
          "5 x 1 = 5\n5 x 2 = 10\n5 x 3 = 15\n5 x 4 = 20\n5 x 5 = 25\n" +
          "5 x 6 = 30\n5 x 7 = 35\n5 x 8 = 40\n5 x 9 = 45\n5 x 10 = 50\n",
      },
    ],
  },

  // ── Python Quickstart ──────────────────────────────────────────
  {
    courseTitle: "Python Quickstart",
    slug: "py-hello",
    note: "Print Hello, world!",
    testcases: [
      { name: "no input", input: "", expectedOutput: "Hello, world!\n" },
    ],
  },
  {
    courseTitle: "Python Quickstart",
    slug: "py-circle",
    note: "Area of a circle with radius 5",
    testcases: [
      // math.pi * 25 = 78.53981633974483 — Python's default repr
      {
        name: "radius 5",
        input: "",
        expectedOutput: "78.53981633974483\n",
      },
    ],
  },
  {
    courseTitle: "Python Quickstart",
    slug: "py-fizzbuzz",
    note: "FizzBuzz 1..15",
    testcases: [
      {
        name: "1..15",
        input: "",
        expectedOutput:
          "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n" +
          "11\nFizz\n13\n14\nFizzBuzz\n",
      },
    ],
  },
];

async function findCourseId(title: string): Promise<number | null> {
  const rows = await db
    .select({ courseId: CoursesTable.courseId })
    .from(CoursesTable)
    .where(eq(CoursesTable.title, title))
    .limit(1);
  return rows[0]?.courseId ?? null;
}

async function patchLesson(p: Patch): Promise<"patched" | "skipped" | "missing"> {
  const courseId = await findCourseId(p.courseTitle);
  if (courseId === null) return "missing";

  const rows = await db
    .select()
    .from(LessonsTable)
    .where(
      and(
        eq(LessonsTable.courseId, courseId),
        eq(LessonsTable.slug, p.slug),
      ),
    )
    .limit(1);
  if (rows.length === 0) return "missing";

  const lesson = rows[0];
  const content = (lesson.content ?? {}) as ExerciseLessonContent;
  if (content.testcases && content.testcases.length > 0) {
    return "skipped";
  }

  const newContent: ExerciseLessonContent = {
    ...content,
    regex: undefined,
    expectedOutput: undefined,
    testcases: p.testcases,
  };

  await db
    .update(LessonsTable)
    .set({ content: newContent })
    .where(eq(LessonsTable.id, lesson.id));
  return "patched";
}

async function main() {
  let patched = 0;
  let skipped = 0;
  let missing = 0;
  for (const p of PATCHES) {
    const r = await patchLesson(p);
    if (r === "patched") {
      patched++;
      console.log(`  ✓ patched: ${p.courseTitle} / ${p.slug}  — ${p.note}`);
    } else if (r === "skipped") {
      skipped++;
      console.log(`  · skipped (already has testcases): ${p.slug}`);
    } else {
      missing++;
      console.log(`  ! missing course or lesson: ${p.courseTitle} / ${p.slug}`);
    }
  }
  console.log("\n---");
  console.log(`Patched: ${patched}   Skipped: ${skipped}   Missing: ${missing}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
