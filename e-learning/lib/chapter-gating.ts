import type { VideoLessonContent } from "@/config/schema";

// A lesson is "gating" if completing it is required for the chapter to
// count as finished. Standalone quizzes and exercises always gate;
// video lessons gate only when they have at least one in-video quiz
// checkpoint (a plain video is just optional viewing). PDFs are
// always optional reading and never gate.
export function isLessonGating(lesson: {
  type: string;
  content?: unknown;
}): boolean {
  if (lesson.type === "quiz") return true;
  if (lesson.type === "exercise") return true;
  if (lesson.type === "video") {
    const c = lesson.content as VideoLessonContent | undefined;
    return (c?.inVideoQuizzes?.length ?? 0) > 0;
  }
  return false;
}

type ChapterForGating = {
  lessons: { id: number; gating?: boolean }[];
};

// Returns true iff the chapter at `chapterIndex` is reachable by the
// student given their completed-lesson set. The first chapter (index 0)
// is always unlocked. Subsequent chapters require every gating lesson
// in the immediately previous chapter to be in `completedLessonIds`.
//
// Chapters whose previous chapter has no gating lessons are unlocked
// (a reading-only chapter can't gate the next one — the admin gets the
// behaviour they implied by not adding any quizzes / exercises).
export function isChapterUnlocked(
  chapters: ChapterForGating[],
  chapterIndex: number,
  completedLessonIds: number[],
): boolean {
  if (chapterIndex <= 0) return true;
  const prev = chapters[chapterIndex - 1];
  if (!prev) return true;
  const gating = prev.lessons.filter((l) => l.gating);
  if (gating.length === 0) return true;
  const completed = new Set(completedLessonIds);
  return gating.every((l) => completed.has(l.id));
}
