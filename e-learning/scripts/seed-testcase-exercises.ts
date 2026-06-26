import "dotenv/config";
import { and, eq, max } from "drizzle-orm";
import { db } from "../config/db";
import {
  CourseChapterTable,
  CoursesTable,
  LessonsTable,
  type ExerciseTestCase,
} from "../config/schema";

// Adds a new chapter to each language demo course (C++ Foundations and
// Python Quickstart) containing exercises graded by stdin/stdout test
// cases via Judge0. Demonstrates the "must pass every case for full
// XP" mechanism — including hidden cases so admins / students can see
// how the privacy contract behaves.
//
// Idempotent. Matches courses by exact title, chapters by name within
// the course, and lessons by slug — re-running skips anything that
// already exists.
//
// Run:  npx tsx scripts/seed-testcase-exercises.ts
//
// Requires JUDGE0_RAPIDAPI_KEY in env at *runtime* (when a student
// actually grades a submission). Seeding itself doesn't call Judge0.

type ExerciseLesson = {
  slug: string;
  title: string;
  xp: number;
  difficulty: "easy" | "medium" | "hard";
  task: string;            // HTML
  content: string;         // HTML — the lesson body / problem statement
  hint: string;            // HTML
  hintXp: number;
  starterFile: string;     // e.g. "/main.cpp" or "/main.py"
  starterCode: string;
  testcases: ExerciseTestCase[];
};

type CourseTarget = {
  courseTitle: string;
  chapterName: string;
  chapterDesc: string;
  lessons: ExerciseLesson[];
};

const CPP_TARGET: CourseTarget = {
  courseTitle: "C++ Foundations",
  chapterName: "Test-case exercises",
  chapterDesc:
    "Each lesson is graded by Judge0 against several stdin/stdout cases — every case must pass for full XP. Some cases are hidden so the expected output isn't visible in the page.",
  lessons: [
    {
      slug: "cpp-tc-sum-two",
      title: "TC — Sum of two integers",
      xp: 20,
      difficulty: "easy",
      content:
        "<p>Read two integers from standard input (separated by whitespace), then print their sum followed by a newline.</p>",
      task:
        "<p>Implement the program so that, given stdin <code>3 4</code>, it prints <code>7</code>. The grader will run several visible and hidden test cases via Judge0 — all of them must pass for the XP to credit.</p>",
      hint:
        "<p><code>int a, b; std::cin &gt;&gt; a &gt;&gt; b; std::cout &lt;&lt; (a + b) &lt;&lt; '\\n';</code></p>",
      hintXp: 3,
      starterFile: "/main.cpp",
      starterCode:
        "#include <iostream>\n\nint main() {\n    int a, b;\n    std::cin >> a >> b;\n    // TODO: print a + b\n    return 0;\n}\n",
      testcases: [
        { name: "small positives", input: "3 4\n", expectedOutput: "7\n" },
        { name: "with zero", input: "0 10\n", expectedOutput: "10\n" },
        { name: "negatives", input: "-5 -7\n", expectedOutput: "-12\n", hidden: true },
        { name: "large", input: "1000000 2000000\n", expectedOutput: "3000000\n", hidden: true },
      ],
    },
    {
      slug: "cpp-tc-sum-n",
      title: "TC — Sum of N integers",
      xp: 25,
      difficulty: "easy",
      content:
        "<p>The first line of input is <code>N</code> — the number of integers that follow. Read those <code>N</code> integers (any whitespace-separated layout is fine) and print their sum on a single line.</p>",
      task:
        "<p>For example, given:</p><pre>3\n1 2 3</pre><p>Your program should print <code>6</code>.</p>",
      hint:
        "<p>Read <code>n</code>, then loop <code>n</code> times accumulating <code>std::cin &gt;&gt; x</code> into a running total.</p>",
      hintXp: 4,
      starterFile: "/main.cpp",
      starterCode:
        "#include <iostream>\n\nint main() {\n    int n;\n    std::cin >> n;\n    // TODO: read n integers and print their sum\n    return 0;\n}\n",
      testcases: [
        { name: "three numbers", input: "3\n1 2 3\n", expectedOutput: "6\n" },
        { name: "single value", input: "1\n42\n", expectedOutput: "42\n" },
        { name: "all zeros", input: "5\n0 0 0 0 0\n", expectedOutput: "0\n", hidden: true },
        { name: "mixed signs", input: "4\n10 -3 7 -4\n", expectedOutput: "10\n", hidden: true },
      ],
    },
    {
      slug: "cpp-tc-max-array",
      title: "TC — Maximum value in an array",
      xp: 25,
      difficulty: "medium",
      content:
        "<p>Find the largest integer in a sequence. The first line is <code>N</code>; the next line has <code>N</code> integers separated by spaces.</p>",
      task:
        "<p>Print the maximum on its own line. Assume <code>1 &le; N &le; 10000</code> and each value fits in a 32-bit int.</p>",
      hint:
        "<p>Track a running <code>best</code> initialised with the first value, then update it inside the loop.</p>",
      hintXp: 5,
      starterFile: "/main.cpp",
      starterCode:
        "#include <iostream>\n#include <climits>\n\nint main() {\n    int n;\n    std::cin >> n;\n    // TODO: read n integers, print the maximum\n    return 0;\n}\n",
      testcases: [
        { name: "all positive", input: "5\n3 1 4 1 5\n", expectedOutput: "5\n" },
        { name: "single element", input: "1\n-42\n", expectedOutput: "-42\n" },
        { name: "all negative", input: "4\n-9 -1 -7 -3\n", expectedOutput: "-1\n", hidden: true },
        { name: "tie at the end", input: "6\n2 2 2 7 7 7\n", expectedOutput: "7\n", hidden: true },
      ],
    },
    {
      slug: "cpp-tc-reverse-string",
      title: "TC — Reverse a string",
      xp: 25,
      difficulty: "medium",
      content:
        "<p>Read a single line from standard input (it may contain spaces) and print its reverse. Preserve internal spacing.</p>",
      task:
        "<p>Example: input <code>hello world</code> → output <code>dlrow olleh</code>. The grader compares the whole reversed line.</p>",
      hint:
        "<p><code>std::getline(std::cin, s)</code> reads the whole line, then <code>std::reverse(s.begin(), s.end())</code>.</p>",
      hintXp: 6,
      starterFile: "/main.cpp",
      starterCode:
        "#include <iostream>\n#include <string>\n#include <algorithm>\n\nint main() {\n    std::string s;\n    std::getline(std::cin, s);\n    // TODO: reverse and print\n    return 0;\n}\n",
      testcases: [
        { name: "single word", input: "hello\n", expectedOutput: "olleh\n" },
        { name: "two words", input: "hello world\n", expectedOutput: "dlrow olleh\n" },
        { name: "palindrome", input: "level\n", expectedOutput: "level\n", hidden: true },
        { name: "mixed punctuation", input: "ABC, 123!\n", expectedOutput: "!321 ,CBA\n", hidden: true },
      ],
    },
  ],
};

const PYTHON_TARGET: CourseTarget = {
  courseTitle: "Python Quickstart",
  chapterName: "Test-case exercises",
  chapterDesc:
    "Each lesson is graded by Judge0 against several stdin/stdout cases — every case must pass for full XP. Try the Run Test Cases button before submitting.",
  lessons: [
    {
      slug: "py-tc-sum-two",
      title: "TC — Sum of two integers",
      xp: 20,
      difficulty: "easy",
      content:
        "<p>Read two integers from <code>input()</code> on one line, separated by a space, and print their sum.</p>",
      task:
        "<p>Given stdin <code>3 4</code>, the program should print <code>7</code>. The grader runs all visible and hidden test cases — every one must pass.</p>",
      hint:
        "<p><code>a, b = map(int, input().split()); print(a + b)</code></p>",
      hintXp: 3,
      starterFile: "/main.py",
      starterCode:
        "# Read two integers separated by a space, print their sum\n",
      testcases: [
        { name: "small positives", input: "3 4\n", expectedOutput: "7\n" },
        { name: "with zero", input: "0 10\n", expectedOutput: "10\n" },
        { name: "negatives", input: "-5 -7\n", expectedOutput: "-12\n", hidden: true },
        { name: "large", input: "1000000 2000000\n", expectedOutput: "3000000\n", hidden: true },
      ],
    },
    {
      slug: "py-tc-average",
      title: "TC — Average of N integers",
      xp: 25,
      difficulty: "easy",
      content:
        "<p>The first line is <code>N</code>; the second line has <code>N</code> integers separated by spaces. Print their average rounded to 2 decimal places.</p>",
      task:
        "<p>Output format: a single floating-point number with two decimals (use <code>f\"{avg:.2f}\"</code>).</p>",
      hint:
        "<p><code>n = int(input()); xs = list(map(int, input().split())); print(f\"{sum(xs)/n:.2f}\")</code></p>",
      hintXp: 5,
      starterFile: "/main.py",
      starterCode:
        "# Read N then N integers, print average to 2 decimals\n",
      testcases: [
        { name: "three numbers", input: "3\n1 2 3\n", expectedOutput: "2.00\n" },
        { name: "single value", input: "1\n42\n", expectedOutput: "42.00\n" },
        { name: "needs rounding", input: "3\n1 1 2\n", expectedOutput: "1.33\n", hidden: true },
        { name: "mixed signs", input: "4\n10 -2 6 -4\n", expectedOutput: "2.50\n", hidden: true },
      ],
    },
    {
      slug: "py-tc-count-vowels",
      title: "TC — Count vowels in a string",
      xp: 25,
      difficulty: "medium",
      content:
        "<p>Read a single line and count how many lowercase vowels (<code>a, e, i, o, u</code>) it contains. Print the count on its own line.</p>",
      task:
        "<p>Case-sensitive — only lowercase vowels count. Spaces and punctuation are ignored automatically because they aren't vowels.</p>",
      hint:
        "<p><code>s = input(); print(sum(1 for c in s if c in \"aeiou\"))</code></p>",
      hintXp: 5,
      starterFile: "/main.py",
      starterCode:
        "# Count lowercase vowels in a single input line\n",
      testcases: [
        { name: "simple word", input: "hello\n", expectedOutput: "2\n" },
        { name: "no vowels", input: "rhythm\n", expectedOutput: "0\n" },
        { name: "all vowels", input: "aeiou\n", expectedOutput: "5\n", hidden: true },
        { name: "mixed case ignored", input: "BANANA banana\n", expectedOutput: "3\n", hidden: true },
      ],
    },
    {
      slug: "py-tc-palindrome",
      title: "TC — Palindrome check",
      xp: 30,
      difficulty: "medium",
      content:
        "<p>Read a single line and decide whether it is a palindrome (reads the same forwards and backwards). Print <code>YES</code> or <code>NO</code>.</p>",
      task:
        "<p>Case-sensitive, whitespace counts. <code>aba</code> is a palindrome; <code>Aba</code> is not.</p>",
      hint:
        "<p><code>s = input(); print(\"YES\" if s == s[::-1] else \"NO\")</code></p>",
      hintXp: 6,
      starterFile: "/main.py",
      starterCode:
        "# Print YES if the input line is a palindrome, otherwise NO\n",
      testcases: [
        { name: "trivial yes", input: "aba\n", expectedOutput: "YES\n" },
        { name: "trivial no", input: "abc\n", expectedOutput: "NO\n" },
        { name: "case matters", input: "Aba\n", expectedOutput: "NO\n", hidden: true },
        { name: "longer palindrome", input: "racecar\n", expectedOutput: "YES\n", hidden: true },
      ],
    },
  ],
};

async function findCourseId(title: string): Promise<number | null> {
  const rows = await db
    .select({ courseId: CoursesTable.courseId })
    .from(CoursesTable)
    .where(eq(CoursesTable.title, title))
    .limit(1);
  return rows[0]?.courseId ?? null;
}

async function nextChapterId(courseId: number): Promise<number> {
  const [{ value }] = await db
    .select({ value: max(CourseChapterTable.chapterId) })
    .from(CourseChapterTable)
    .where(eq(CourseChapterTable.courseId, courseId));
  return (value ?? 0) + 1;
}

async function findOrCreateChapter(
  courseId: number,
  name: string,
  desc: string,
): Promise<number> {
  const existing = await db
    .select({ chapterId: CourseChapterTable.chapterId })
    .from(CourseChapterTable)
    .where(
      and(
        eq(CourseChapterTable.courseId, courseId),
        eq(CourseChapterTable.name, name),
      ),
    )
    .limit(1);
  if (existing.length > 0 && existing[0].chapterId !== null) {
    return existing[0].chapterId;
  }

  const chapterId = await nextChapterId(courseId);
  await db.insert(CourseChapterTable).values({
    courseId,
    chapterId,
    name,
    desc,
  });
  console.log(`  Created chapter ${chapterId} — ${name}`);
  return chapterId;
}

async function insertLessonIfMissing(
  courseId: number,
  chapterId: number,
  orderIndex: number,
  lesson: ExerciseLesson,
) {
  const existing = await db
    .select({ id: LessonsTable.id })
    .from(LessonsTable)
    .where(
      and(
        eq(LessonsTable.courseId, courseId),
        eq(LessonsTable.chapterId, chapterId),
        eq(LessonsTable.slug, lesson.slug),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    console.log(`  Skipped (already exists): ${lesson.slug}`);
    return;
  }

  await db.insert(LessonsTable).values({
    courseId,
    chapterId,
    slug: lesson.slug,
    orderIndex,
    type: "exercise",
    title: lesson.title,
    xp: lesson.xp,
    content: {
      content: lesson.content,
      task: lesson.task,
      hint: lesson.hint,
      hintXp: lesson.hintXp,
      starterCode: { [lesson.starterFile]: lesson.starterCode },
      testcases: lesson.testcases,
      difficulty: lesson.difficulty,
    },
  });
  console.log(`  Inserted: ${lesson.slug} (${lesson.testcases.length} test cases)`);
}

async function seedTarget(target: CourseTarget) {
  console.log(`\n=== ${target.courseTitle} ===`);
  const courseId = await findCourseId(target.courseTitle);
  if (courseId === null) {
    console.log(
      `  Course not found. Run "npm run seed:language-demos" first to create the base courses.`,
    );
    return;
  }
  console.log(`  courseId = ${courseId}`);
  const chapterId = await findOrCreateChapter(
    courseId,
    target.chapterName,
    target.chapterDesc,
  );
  for (let i = 0; i < target.lessons.length; i++) {
    await insertLessonIfMissing(courseId, chapterId, i, target.lessons[i]);
  }
}

async function main() {
  await seedTarget(CPP_TARGET);
  await seedTarget(PYTHON_TARGET);
  console.log("\n---");
  console.log(
    "Done. Open the Python Quickstart / C++ Foundations courses — a new",
  );
  console.log(
    `"Test-case exercises" chapter should appear with ${CPP_TARGET.lessons.length} (C++) + ${PYTHON_TARGET.lessons.length} (Python) graded exercises.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
