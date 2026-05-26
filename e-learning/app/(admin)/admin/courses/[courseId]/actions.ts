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
    throw new Error("Forbidden: admin or librarian role required");
  }
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
  if (type !== "video" && type !== "pdf" && type !== "exercise") {
    return { success: false, error: "Unsupported lesson type" };
  }

  let content: Record<string, unknown>;
  if (type === "video") {
    const provider = (formData.get("provider") as string) || "youtube";
    const url = (formData.get("url") as string)?.trim();
    if (!url) return { success: false, error: "Video URL is required" };
    content = { provider, url };
  } else if (type === "pdf") {
    const pdfUrl = (formData.get("pdfUrl") as string)?.trim();
    if (!pdfUrl) return { success: false, error: "PDF URL is required" };
    content = { pdfUrl };
  } else {
    // Exercise. Build the ExerciseLessonContent payload from the form. Most
    // fields are required so the student playground has something to render;
    // regex / expectedOutput are optional (a lesson without them auto-passes
    // the validation gate from feat28).
    const exContent = (formData.get("content") as string)?.trim();
    const task = (formData.get("task") as string)?.trim();
    const hint = (formData.get("hint") as string)?.trim() ?? "";
    const hintXp = Number(formData.get("hintXp") || 0);
    const difficulty = (formData.get("difficulty") as string) || "easy";
    const starterFilename = (formData.get("starterFilename") as string)?.trim();
    const starterCodeText = (formData.get("starterCode") as string) ?? "";
    const regex = (formData.get("regex") as string)?.trim() || undefined;
    const expectedOutput = (formData.get("expectedOutput") as string) || undefined;

    if (!exContent) return { success: false, error: "Content (description) is required" };
    if (!task) return { success: false, error: "Task instructions are required" };
    if (!starterFilename) return { success: false, error: "Starter filename is required (e.g. /index.html)" };

    content = {
      content: exContent,
      task,
      hint,
      hintXp,
      starterCode: { [starterFilename]: starterCodeText },
      regex,
      expectedOutput: expectedOutput && expectedOutput.trim() ? expectedOutput : undefined,
      difficulty,
    };
  }

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
