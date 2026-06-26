"use server";

import { db } from "@/config/db";
import {
  CompletedLessonTable,
  CourseChapterTable,
  LessonsTable,
} from "@/config/schema";
import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/checkRole";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function requireAdmin() {
  if (!(await hasAdminAccess())) {
    throw new Error("Forbidden: admin or instructor role required");
  }
}

type BuildResult =
  | { ok: true; content: Record<string, unknown> }
  | { ok: false; error: string };

// Shared between createLessonAction and updateLessonAction so the form
// shape for each lesson type only lives in one place.
function buildLessonContent(type: string, formData: FormData): BuildResult {
  if (type === "video") {
    const provider = (formData.get("provider") as string) || "youtube";
    const url = (formData.get("url") as string)?.trim();
    if (!url) return { ok: false, error: "Video URL is required" };

    // In-video quiz checkpoints come through as a JSON string set by the
    // hidden input in CheckpointsEditor. Optional; valid forms can have
    // zero checkpoints (just a plain video).
    const rawCheckpoints = (formData.get("inVideoQuizzes") as string) ?? "";
    let checkpoints: unknown[] = [];
    if (rawCheckpoints) {
      try {
        const parsed = JSON.parse(rawCheckpoints);
        if (!Array.isArray(parsed)) {
          return { ok: false, error: "Checkpoints payload must be an array" };
        }
        checkpoints = parsed;
      } catch {
        return { ok: false, error: "Could not parse checkpoint data" };
      }
    }
    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i] as Record<string, unknown>;
      if (typeof cp?.timestamp !== "number" || cp.timestamp < 0) {
        return { ok: false, error: `Checkpoint #${i + 1}: timestamp must be a non-negative number` };
      }
      if (typeof cp?.question !== "string" || !cp.question.trim()) {
        return { ok: false, error: `Checkpoint #${i + 1}: question is required` };
      }
      if (
        !Array.isArray(cp?.options) ||
        cp.options.length !== 4 ||
        cp.options.some((o) => typeof o !== "string" || !(o as string).trim())
      ) {
        return { ok: false, error: `Checkpoint #${i + 1}: all four options are required` };
      }
      if (
        typeof cp?.correctIndex !== "number" ||
        !Number.isInteger(cp.correctIndex) ||
        cp.correctIndex < 0 ||
        cp.correctIndex >= 4
      ) {
        return { ok: false, error: `Checkpoint #${i + 1}: pick which option is correct` };
      }
      if (typeof cp?.xp !== "number" || cp.xp < 0) {
        return { ok: false, error: `Checkpoint #${i + 1}: XP must be a non-negative number` };
      }
    }
    const content: Record<string, unknown> = { provider, url };
    if (checkpoints.length > 0) content.inVideoQuizzes = checkpoints;
    return { ok: true, content };
  }
  if (type === "pdf") {
    const pdfUrl = (formData.get("pdfUrl") as string)?.trim();
    if (!pdfUrl) return { ok: false, error: "PDF URL is required" };
    return { ok: true, content: { pdfUrl } };
  }
  if (type === "exercise") {
    const exContent = (formData.get("content") as string)?.trim();
    const task = (formData.get("task") as string)?.trim();
    const hint = (formData.get("hint") as string)?.trim() ?? "";
    const hintXp = Number(formData.get("hintXp") || 0);
    const difficulty = (formData.get("difficulty") as string) || "easy";
    const starterFilename = (formData.get("starterFilename") as string)?.trim();
    const starterCodeText = (formData.get("starterCode") as string) ?? "";
    const regex = (formData.get("regex") as string)?.trim() || undefined;
    const expectedOutput = (formData.get("expectedOutput") as string) || undefined;

    // TestcasesEditor serialises its rows as a JSON array on a hidden
    // input. Parse defensively — a malformed payload should fall back
    // to "no test cases" rather than spike the whole save.
    const rawTestcases = (formData.get("testcases") as string) ?? "";
    let testcases: Array<{
      name?: string;
      input: string;
      expectedOutput: string;
      hidden?: boolean;
    }> = [];
    if (rawTestcases) {
      try {
        const parsed = JSON.parse(rawTestcases);
        if (Array.isArray(parsed)) {
          testcases = parsed
            .filter(
              (t): t is { input: string; expectedOutput: string } =>
                t && typeof t === "object" &&
                typeof (t as { input?: unknown }).input === "string" &&
                typeof (t as { expectedOutput?: unknown }).expectedOutput === "string",
            )
            .map((t) => {
              const raw = t as {
                name?: unknown;
                input: string;
                expectedOutput: string;
                hidden?: unknown;
              };
              return {
                name:
                  typeof raw.name === "string"
                    ? raw.name.trim() || undefined
                    : undefined,
                input: raw.input,
                expectedOutput: raw.expectedOutput,
                hidden: Boolean(raw.hidden),
              };
            });
        }
      } catch {
        // Ignore — the form re-renders and the admin can fix it.
      }
    }

    if (!exContent) return { ok: false, error: "Content (description) is required" };
    if (!task) return { ok: false, error: "Task instructions are required" };
    if (!starterFilename) return { ok: false, error: "Starter filename is required (e.g. /index.html)" };
    return {
      ok: true,
      content: {
        content: exContent,
        task,
        hint,
        hintXp,
        starterCode: { [starterFilename]: starterCodeText },
        regex,
        expectedOutput: expectedOutput && expectedOutput.trim() ? expectedOutput : undefined,
        testcases: testcases.length > 0 ? testcases : undefined,
        difficulty,
      },
    };
  }
  if (type === "quiz") {
    const question = (formData.get("question") as string)?.trim();
    const options = [1, 2, 3, 4]
      .map((i) => (formData.get(`option${i}`) as string) ?? "")
      .map((s) => s.trim());
    const correctIndex = Number(formData.get("correctIndex"));
    const explanation = (formData.get("explanation") as string)?.trim() || undefined;
    if (!question) return { ok: false, error: "Question is required" };
    if (options.some((o) => o.length === 0)) {
      return { ok: false, error: "All four answer options are required" };
    }
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= 4) {
      return { ok: false, error: "Pick which option is the correct answer" };
    }
    return {
      ok: true,
      content: { question, options, correctIndex, explanation },
    };
  }
  return { ok: false, error: "Unsupported lesson type" };
}

export async function createChapterAction(courseId: number, formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  const desc = (formData.get("desc") as string)?.trim();

  if (!name) {
    return { success: false, error: "Chapter name is required" };
  }

  // Auto-assign chapterId as MAX(chapterId for this course) + 1 so admins
  // don't have to track ordering by hand.
  const [{ value: currentMax }] = await db
    .select({ value: max(CourseChapterTable.chapterId) })
    .from(CourseChapterTable)
    .where(eq(CourseChapterTable.courseId, courseId));
  const chapterId = (currentMax ?? 0) + 1;

  await db.insert(CourseChapterTable).values({
    courseId,
    chapterId,
    name,
    desc,
  });

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}`);
}

export async function deleteChapterAction(courseId: number, chapterRowId: number) {
  await requireAdmin();

  const [chapter] = await db
    .select()
    .from(CourseChapterTable)
    .where(eq(CourseChapterTable.id, chapterRowId))
    .limit(1);

  if (!chapter || !chapter.chapterId) {
    revalidatePath(`/admin/courses/${courseId}`);
    return;
  }

  // Refuse to delete a chapter that still has lessons — admin must remove
  // them first to avoid orphan rows in completedLesson.
  const remaining = await db
    .select({ id: LessonsTable.id })
    .from(LessonsTable)
    .where(
      and(
        eq(LessonsTable.courseId, courseId),
        eq(LessonsTable.chapterId, chapter.chapterId),
      ),
    )
    .limit(1);

  if (remaining.length > 0) {
    throw new Error("Delete all lessons in this chapter before removing it.");
  }

  await db.delete(CourseChapterTable).where(eq(CourseChapterTable.id, chapterRowId));
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function createLessonAction(courseId: number, formData: FormData) {
  await requireAdmin();

  const chapterId = Number(formData.get("chapterId"));
  const type = formData.get("type") as string;
  const title = (formData.get("title") as string)?.trim();
  const xp = Number(formData.get("xp") || 0);

  if (!Number.isFinite(chapterId) || chapterId <= 0) {
    return { success: false, error: "Choose a chapter" };
  }
  if (!title) {
    return { success: false, error: "Lesson title is required" };
  }
  if (type !== "video" && type !== "pdf" && type !== "exercise" && type !== "quiz") {
    return { success: false, error: "Unsupported lesson type" };
  }

  const contentResult = buildLessonContent(type, formData);
  if (!contentResult.ok) return { success: false, error: contentResult.error };
  const content = contentResult.content;

  // Auto orderIndex and slug so admins don't have to think about them.
  const [{ value: currentMax }] = await db
    .select({ value: max(LessonsTable.orderIndex) })
    .from(LessonsTable)
    .where(
      and(eq(LessonsTable.courseId, courseId), eq(LessonsTable.chapterId, chapterId)),
    );
  const orderIndex = (currentMax ?? -1) + 1;
  const slug = `${slugify(title)}-${Date.now().toString(36)}`;

  await db.insert(LessonsTable).values({
    courseId,
    chapterId,
    slug,
    orderIndex,
    type,
    title,
    xp,
    content,
  });

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}`);
}

export async function deleteLessonAction(courseId: number, lessonId: number) {
  await requireAdmin();

  // Clean up completion records first so we don't leave orphan rows.
  await db.delete(CompletedLessonTable).where(eq(CompletedLessonTable.lessonId, lessonId));
  await db.delete(LessonsTable).where(eq(LessonsTable.id, lessonId));

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function updateChapterAction(
  courseId: number,
  chapterRowId: number,
  formData: FormData,
) {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const desc = (formData.get("desc") as string)?.trim();
  if (!name) {
    return { success: false, error: "Chapter name is required" };
  }

  await db
    .update(CourseChapterTable)
    .set({ name, desc })
    .where(eq(CourseChapterTable.id, chapterRowId));

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}`);
}

export async function updateLessonAction(
  courseId: number,
  lessonId: number,
  formData: FormData,
) {
  await requireAdmin();

  const [lesson] = await db
    .select()
    .from(LessonsTable)
    .where(eq(LessonsTable.id, lessonId))
    .limit(1);
  if (!lesson) {
    return { success: false, error: "Lesson not found" };
  }

  const title = (formData.get("title") as string)?.trim();
  const xp = Number(formData.get("xp") || 0);
  if (!title) {
    return { success: false, error: "Lesson title is required" };
  }

  // Type is intentionally not editable — switching type would invalidate
  // the existing content shape. Admin must delete + recreate to change type.
  const contentResult = buildLessonContent(lesson.type, formData);
  if (!contentResult.ok) return { success: false, error: contentResult.error };
  const content = contentResult.content;

  await db
    .update(LessonsTable)
    .set({ title, xp, content })
    .where(eq(LessonsTable.id, lessonId));

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}`);
}
