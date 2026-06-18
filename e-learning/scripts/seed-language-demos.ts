import "dotenv/config";
import { and, eq, max } from "drizzle-orm";
import { db } from "../config/db";
import {
  CourseChapterTable,
  CoursesTable,
  LessonsTable,
} from "../config/schema";

// Seeds three demo courses, one per editor type, so the playground's
// new multi-language support has something realistic to point at:
//   - "Web Foundations"      → editorType=static (Sandpack HTML/CSS/JS)
//   - "Python Quickstart"    → editorType=python (Pyodide in-browser)
//   - "C++ Foundations"      → editorType=cpp    (Judge0 cloud)
//
// Each course gets 3 chapters with a mix of PDF intro, quiz, and
// hands-on exercise lessons that exercise the matching runtime.
//
// Idempotent. Re-running tops up any missing chapters / lessons,
// matched by (courseId, chapterId, slug). Courses themselves are
// matched by title.
//
// Run:  npm run seed:language-demos

const BANNER =
  "https://res.cloudinary.com/dxsoyupfv/image/upload/v1700000000/sample.jpg";

type CourseSeed = {
  title: string;
  desc: string;
  editorType: "static" | "python" | "cpp";
  tags: string;
  chapters: ChapterSeed[];
};

type ChapterSeed = {
  name: string;
  desc: string;
  lessons: LessonSeed[];
};

type LessonSeed = {
  slug: string;
  title: string;
  xp: number;
  type: "pdf" | "quiz" | "exercise";
  content: Record<string, unknown>;
};

const COURSES: CourseSeed[] = [
  // ───────────────────────────────────────────────── Web Foundations
  {
    title: "Web Foundations — HTML / CSS / JS",
    desc:
      "Build your first web page from scratch. Hands-on Sandpack exercises with a live preview pane.",
    editorType: "static",
    tags: "web,html,css,javascript,beginner",
    chapters: [
      {
        name: "HTML basics",
        desc: "Structure your first page.",
        lessons: [
          {
            slug: "html-welcome",
            title: "Welcome to HTML",
            xp: 5,
            type: "pdf",
            content: {
              pdfUrl:
                "https://docs.google.com/document/d/e/2PACX-1vT3jdQ2t9kZSL3rmFCmHflbI-LO2tWeSLLIRjyDoGZP4Y_-9X-EbWMOG6q4j8O3HQ/pub",
            },
          },
          {
            slug: "html-first-page",
            title: "Exercise — Write a page title",
            xp: 15,
            type: "exercise",
            content: {
              content:
                "<p>Every HTML document starts with a <code>&lt;title&gt;</code> element inside <code>&lt;head&gt;</code>. The text inside it shows up on the browser tab.</p>",
              task:
                "<p>Set the page title to <strong>My First Page</strong>. The preview tab won't update its label, but the validator will check that <code>&lt;title&gt;My First Page&lt;/title&gt;</code> is present in your HTML.</p>",
              hint:
                "<p>Add the line <code>&lt;title&gt;My First Page&lt;/title&gt;</code> between the opening <code>&lt;head&gt;</code> and the closing <code>&lt;/head&gt;</code>.</p>",
              hintXp: 5,
              starterCode: {
                "/index.html":
                  '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title></title>\n  </head>\n  <body>\n    <h1>Hello, web!</h1>\n  </body>\n</html>\n',
              },
              regex: "(?i)<title>\\s*My First Page\\s*</title>",
              difficulty: "easy",
            },
          },
        ],
      },
      {
        name: "CSS styling",
        desc: "Make it pretty.",
        lessons: [
          {
            slug: "css-quiz",
            title: "Quiz — CSS selectors",
            xp: 10,
            type: "quiz",
            content: {
              question:
                "<p>Which selector targets every <code>&lt;p&gt;</code> element on the page?</p>",
              options: [
                "p",
                "#p",
                ".p",
                "*p",
              ],
              correctIndex: 0,
              explanation:
                "<p>An element selector is just the tag name — <code>p</code>. <code>#</code> is for ids, <code>.</code> for classes.</p>",
            },
          },
          {
            slug: "css-background",
            title: "Exercise — Yellow background",
            xp: 15,
            type: "exercise",
            content: {
              content:
                "<p>You can style HTML elements directly from a <code>&lt;style&gt;</code> block. The <code>background-color</code> property accepts named colors, hex codes, and rgb().</p>",
              task:
                "<p>Make the page's <code>body</code> background color <strong>yellow</strong>. The validator looks for <code>background-color: yellow</code> in your CSS.</p>",
              hint:
                "<p>Inside the <code>&lt;style&gt;</code> block, add <code>body { background-color: yellow; }</code>.</p>",
              hintXp: 3,
              starterCode: {
                "/index.html":
                  '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>Styling</title>\n    <style>\n      /* Add styles here */\n    </style>\n  </head>\n  <body>\n    <h1>I love CSS!</h1>\n  </body>\n</html>\n',
              },
              regex: "(?i)background-color\\s*:\\s*yellow",
              difficulty: "easy",
            },
          },
        ],
      },
      {
        name: "JavaScript intro",
        desc: "Add behavior.",
        lessons: [
          {
            slug: "js-alert",
            title: "Exercise — Button alert",
            xp: 20,
            type: "exercise",
            content: {
              content:
                "<p>JavaScript can react to user actions like clicks. The simplest way to show a message is <code>alert()</code>.</p>",
              task:
                "<p>The page has a button. When the button is clicked, show an alert with the text <strong>Hello!</strong>. The validator searches your code for <code>alert('Hello!')</code> or the double-quoted variant.</p>",
              hint:
                "<p>Inside the <code>&lt;script&gt;</code> block, use <code>document.querySelector('button').addEventListener('click', () =&gt; alert('Hello!'))</code>.</p>",
              hintXp: 5,
              starterCode: {
                "/index.html":
                  '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>Click me</title>\n  </head>\n  <body>\n    <button>Press me</button>\n    <script>\n      // Add the click handler here\n    </script>\n  </body>\n</html>\n',
              },
              regex: "alert\\(\\s*['\"]Hello!['\"]\\s*\\)",
              difficulty: "medium",
            },
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────── Python Quickstart
  {
    title: "Python Quickstart",
    desc:
      "Run Python directly in your browser via Pyodide. No setup, no installs. Just code.",
    editorType: "python",
    tags: "python,beginner,pyodide",
    chapters: [
      {
        name: "Hello Python",
        desc: "Your first program.",
        lessons: [
          {
            slug: "py-welcome",
            title: "Why Python?",
            xp: 5,
            type: "pdf",
            content: {
              pdfUrl: "https://docs.python.org/3/tutorial/index.html",
            },
          },
          {
            slug: "py-hello",
            title: "Exercise — Print Hello",
            xp: 10,
            type: "exercise",
            content: {
              content:
                "<p><code>print()</code> is how Python writes to standard output. The text inside the parentheses is what gets shown.</p>",
              task:
                "<p>Make the program print exactly <strong>Hello, world!</strong> (including the comma and exclamation mark). Hit Run to execute, then click Mark Completed once it works.</p>",
              hint:
                "<p>Use <code>print(\"Hello, world!\")</code>.</p>",
              hintXp: 2,
              starterCode: {
                "/main.py":
                  "# Write your code below\n",
              },
              expectedOutput: "Hello, world!",
              difficulty: "easy",
            },
          },
        ],
      },
      {
        name: "Variables and math",
        desc: "Work with numbers.",
        lessons: [
          {
            slug: "py-types-quiz",
            title: "Quiz — Variable types",
            xp: 10,
            type: "quiz",
            content: {
              question:
                "<p>What does <code>type(3.14)</code> return in Python?</p>",
              options: [
                "&lt;class 'int'&gt;",
                "&lt;class 'float'&gt;",
                "&lt;class 'double'&gt;",
                "&lt;class 'number'&gt;",
              ],
              correctIndex: 1,
              explanation:
                "<p>Decimal numbers in Python are floating-point. Python doesn't distinguish float vs double like C does.</p>",
            },
          },
          {
            slug: "py-circle",
            title: "Exercise — Area of a circle",
            xp: 20,
            type: "exercise",
            content: {
              content:
                "<p>The area of a circle is <code>π × r²</code>. Python's <code>math</code> module has <code>math.pi</code>.</p>",
              task:
                "<p>Given a radius of 5, compute the circle's area and <code>print()</code> it. The validator checks that your code contains <code>math.pi</code> AND <code>print(</code>.</p>",
              hint:
                "<p>Import math, then <code>print(math.pi * 5 ** 2)</code>.</p>",
              hintXp: 5,
              starterCode: {
                "/main.py":
                  "import math\n\nradius = 5\n# Compute and print the area\n",
              },
              regex: "(?s)math\\.pi.*print\\(",
              difficulty: "easy",
            },
          },
        ],
      },
      {
        name: "Control flow",
        desc: "Loops and conditions.",
        lessons: [
          {
            slug: "py-fizzbuzz",
            title: "Exercise — FizzBuzz",
            xp: 25,
            type: "exercise",
            content: {
              content:
                "<p>FizzBuzz is the canonical loop + conditional exercise. For each number 1 to 15: print 'Fizz' if divisible by 3, 'Buzz' if divisible by 5, 'FizzBuzz' if both, otherwise the number itself.</p>",
              task:
                "<p>Implement FizzBuzz for the numbers 1 through 15 (inclusive). Output should be one value per line. The validator checks that the word <strong>FizzBuzz</strong> appears in your output.</p>",
              hint:
                "<p>Loop with <code>for i in range(1, 16):</code> and use <code>if i % 15 == 0: print('FizzBuzz')</code> as the first branch.</p>",
              hintXp: 8,
              starterCode: {
                "/main.py":
                  "# Print FizzBuzz from 1 to 15\nfor i in range(1, 16):\n    pass  # replace with your logic\n",
              },
              expectedOutput: "FizzBuzz",
              difficulty: "medium",
            },
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────── C++ Foundations
  {
    title: "C++ Foundations",
    desc:
      "Get hands-on with C++ via cloud-compiled execution. Each exercise compiles and runs server-side on Judge0.",
    editorType: "cpp",
    tags: "cpp,c++,beginner,judge0",
    chapters: [
      {
        name: "First program",
        desc: "Hello, world!",
        lessons: [
          {
            slug: "cpp-welcome",
            title: "Why C++?",
            xp: 5,
            type: "pdf",
            content: {
              pdfUrl: "https://www.learncpp.com/cpp-tutorial/introduction-to-cpp-development/",
            },
          },
          {
            slug: "cpp-hello",
            title: "Exercise — Hello world",
            xp: 10,
            type: "exercise",
            content: {
              content:
                "<p>Every C++ program has a <code>main()</code> function. <code>std::cout</code> writes to stdout, and the <code>&lt;&lt;</code> operator chains the value onto it.</p>",
              task:
                "<p>Make the program print exactly <strong>Hello, world!</strong>. Click Run to compile + execute on Judge0, then Mark Completed when it works.</p>",
              hint:
                "<p>Use <code>std::cout &lt;&lt; \"Hello, world!\\n\";</code> inside <code>main()</code>.</p>",
              hintXp: 2,
              starterCode: {
                "/main.cpp":
                  "#include <iostream>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n",
              },
              expectedOutput: "Hello, world!",
              difficulty: "easy",
            },
          },
        ],
      },
      {
        name: "Variables and I/O",
        desc: "Read input, write output.",
        lessons: [
          {
            slug: "cpp-types-quiz",
            title: "Quiz — Integer types",
            xp: 10,
            type: "quiz",
            content: {
              question:
                "<p>Which type is guaranteed to be at least 32 bits wide on every C++ implementation?</p>",
              options: [
                "short",
                "int",
                "long",
                "long long",
              ],
              correctIndex: 3,
              explanation:
                "<p>The standard guarantees <code>long long</code> is at least 64 bits. <code>int</code> and <code>long</code> are commonly 32 bits but not guaranteed.</p>",
            },
          },
          {
            slug: "cpp-sum",
            title: "Exercise — Sum two numbers",
            xp: 20,
            type: "exercise",
            content: {
              content:
                "<p>Read two integers from standard input separated by whitespace, then print their sum on a single line.</p>",
              task:
                "<p>Type <code>3 4</code> into the Stdin box, click Run, and your program should print <strong>7</strong>. The validator checks that your code uses <code>std::cin</code>.</p>",
              hint:
                "<p>Declare two <code>int</code>s, <code>std::cin &gt;&gt; a &gt;&gt; b;</code>, then <code>std::cout &lt;&lt; (a + b) &lt;&lt; '\\n';</code>.</p>",
              hintXp: 5,
              starterCode: {
                "/main.cpp":
                  "#include <iostream>\n\nint main() {\n    int a, b;\n    // Read a and b from stdin, print a + b\n    return 0;\n}\n",
              },
              regex: "std::cin\\s*>>",
              difficulty: "easy",
            },
          },
        ],
      },
      {
        name: "Loops",
        desc: "Repeat with for.",
        lessons: [
          {
            slug: "cpp-multiplication",
            title: "Exercise — Multiplication table",
            xp: 25,
            type: "exercise",
            content: {
              content:
                "<p>A multiplication table for the number 5 is the lines <code>5 x 1 = 5</code> through <code>5 x 10 = 50</code>.</p>",
              task:
                "<p>Print the multiplication table for 5 — exactly 10 lines, in the format <code>5 x i = ...</code>. The validator looks for the line <code>5 x 10 = 50</code> in your output.</p>",
              hint:
                "<p>Use a <code>for (int i = 1; i &lt;= 10; ++i)</code> loop and inside, <code>std::cout &lt;&lt; \"5 x \" &lt;&lt; i &lt;&lt; \" = \" &lt;&lt; 5 * i &lt;&lt; '\\n';</code>.</p>",
              hintXp: 8,
              starterCode: {
                "/main.cpp":
                  "#include <iostream>\n\nint main() {\n    // Print the multiplication table for 5\n    return 0;\n}\n",
              },
              expectedOutput: "5 x 10 = 50",
              difficulty: "medium",
            },
          },
        ],
      },
    ],
  },
];

async function findOrCreateCourse(seed: CourseSeed): Promise<number> {
  const existing = await db
    .select()
    .from(CoursesTable)
    .where(eq(CoursesTable.title, seed.title))
    .limit(1);
  if (existing.length > 0) {
    console.log(
      `Found existing course "${seed.title}" (courseId=${existing[0].courseId}).`,
    );
    return existing[0].courseId;
  }

  const [{ value: currentMax }] = await db
    .select({ value: max(CoursesTable.courseId) })
    .from(CoursesTable);
  const courseId = (currentMax ?? 0) + 1;

  await db.insert(CoursesTable).values({
    courseId,
    title: seed.title,
    desc: seed.desc,
    bannerImage: BANNER,
    level: "beginner",
    tags: seed.tags,
    editorType: seed.editorType,
    unlockCost: 0,
    priceVnd: 0,
  });
  console.log(`Created course "${seed.title}" (courseId=${courseId}).`);
  return courseId;
}

async function findOrCreateChapter(
  courseId: number,
  index: number,
  seed: ChapterSeed,
): Promise<number> {
  const chapterId = index + 1;
  const existing = await db
    .select()
    .from(CourseChapterTable)
    .where(
      and(
        eq(CourseChapterTable.courseId, courseId),
        eq(CourseChapterTable.chapterId, chapterId),
      ),
    )
    .limit(1);
  if (existing.length > 0) return chapterId;

  await db.insert(CourseChapterTable).values({
    courseId,
    chapterId,
    name: seed.name,
    desc: seed.desc,
  });
  return chapterId;
}

async function insertLessonIfMissing(
  courseId: number,
  chapterId: number,
  orderIndex: number,
  lesson: LessonSeed,
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
    type: lesson.type,
    title: lesson.title,
    xp: lesson.xp,
    content: lesson.content,
  });
  console.log(`  Inserted: ${lesson.slug}`);
}

async function main() {
  for (const courseSeed of COURSES) {
    console.log(`\n=== ${courseSeed.title} ===`);
    const courseId = await findOrCreateCourse(courseSeed);
    for (let i = 0; i < courseSeed.chapters.length; i++) {
      const chapterSeed = courseSeed.chapters[i];
      const chapterId = await findOrCreateChapter(courseId, i, chapterSeed);
      console.log(`  Chapter ${chapterId} — ${chapterSeed.name}`);
      for (let j = 0; j < chapterSeed.lessons.length; j++) {
        await insertLessonIfMissing(
          courseId,
          chapterId,
          j,
          chapterSeed.lessons[j],
        );
      }
    }
  }
  console.log("\n---");
  console.log("Done. Three demo courses ready.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
