"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Code2,
  FileText,
  HelpCircle,
  Lock,
  Video,
} from "lucide-react";
import { isChapterUnlocked } from "@/lib/chapter-gating";

type SidebarLesson = {
  id: number;
  slug: string;
  title: string;
  type: string;
  xp: number;
  // Set by /api/course on the listing payload — true for quiz /
  // exercise / video-with-checkpoints. Needed by the chapter-gating
  // helper to decide if the next chapter is unlocked.
  gating?: boolean;
};

type SidebarChapter = {
  chapterId: number;
  name: string | null;
  lessons: SidebarLesson[];
};

type Props = {
  courseId: number;
  courseTitle: string;
  chapters: SidebarChapter[];
  completedLessonIds: number[];
  currentLessonId: number | undefined;
  currentChapterId: number | undefined;
  /**
   * When provided, the sidebar dispatches this on every nav click so a
   * mobile drawer can close itself before the route change.
   */
  onNavigate?: () => void;
};

function lessonIcon(type: string) {
  const cls = "w-4 h-4 shrink-0";
  if (type === "video") return <Video className={`${cls} text-pink-300`} />;
  if (type === "pdf") return <FileText className={`${cls} text-blue-300`} />;
  if (type === "quiz") return <HelpCircle className={`${cls} text-purple-300`} />;
  return <Code2 className={`${cls} text-green-300`} />;
}

function LessonSidebar({
  courseId,
  courseTitle,
  chapters,
  completedLessonIds,
  currentLessonId,
  currentChapterId,
  onNavigate,
}: Props) {
  return (
    <aside className="h-full w-full md:w-72 shrink-0 bg-zinc-950 border-r-2 border-zinc-800 flex flex-col font-game overflow-hidden">
      {/* Back button + course title */}
      <div className="p-4 border-b-2 border-zinc-800 flex flex-col gap-2 shrink-0">
        <Link
          href="/"
          onClick={onNavigate}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-yellow-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
        <Link
          href={`/courses/${courseId}`}
          onClick={onNavigate}
          className="text-lg leading-tight text-white hover:text-yellow-300 transition-colors line-clamp-2"
          title={courseTitle}
        >
          {courseTitle}
        </Link>
      </div>

      {/* Chapter + lesson list */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 pb-24">
        {chapters.length === 0 ? (
          <p className="text-xs text-zinc-500 px-2 py-3">No chapters yet.</p>
        ) : (
          chapters.map((chapter, chapterIndex) => {
            const chapterUnlocked = isChapterUnlocked(
              chapters,
              chapterIndex,
              completedLessonIds,
            );
            const isCurrentChapter = chapter.chapterId === currentChapterId;
            return (
              <div key={chapter.chapterId} className="flex flex-col gap-1">
                <div className="flex items-center justify-between px-2">
                  <h3
                    className={`text-xs uppercase tracking-wider ${
                      isCurrentChapter ? "text-yellow-300" : "text-zinc-500"
                    }`}
                  >
                    Ch. {chapter.chapterId} · {chapter.name}
                  </h3>
                  {!chapterUnlocked && (
                    <Lock
                      className="w-3.5 h-3.5 text-zinc-600 shrink-0"
                      aria-label="Chapter locked"
                    />
                  )}
                </div>

                <ul className="flex flex-col">
                  {chapter.lessons.map((lesson) => {
                    const isCompleted = completedLessonIds.includes(lesson.id);
                    const isCurrent = lesson.id === currentLessonId;
                    const isLocked = !chapterUnlocked;

                    const rowCls = `flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors ${
                      isCurrent
                        ? "bg-yellow-400/15 border border-yellow-400/50 text-yellow-200"
                        : isLocked
                        ? "text-zinc-600 cursor-not-allowed"
                        : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    }`;

                    const content = (
                      <>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        ) : isLocked ? (
                          <Lock className="w-4 h-4 text-zinc-600 shrink-0" />
                        ) : (
                          lessonIcon(lesson.type)
                        )}
                        <span className="flex-1 truncate" title={lesson.title}>
                          {lesson.title}
                        </span>
                        <span
                          className={`text-xs shrink-0 ${
                            isCompleted ? "text-green-400" : "text-zinc-500"
                          }`}
                        >
                          {lesson.xp}xp
                        </span>
                      </>
                    );

                    return (
                      <li key={lesson.id}>
                        {isLocked ? (
                          <div className={rowCls}>{content}</div>
                        ) : (
                          <Link
                            href={`/courses/${courseId}/${chapter.chapterId}/${lesson.slug}`}
                            onClick={onNavigate}
                            className={rowCls}
                          >
                            {content}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

export default LessonSidebar;
