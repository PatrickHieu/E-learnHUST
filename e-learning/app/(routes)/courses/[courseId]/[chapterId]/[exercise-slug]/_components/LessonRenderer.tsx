"use client";
import React from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ContentSection from "./ContentSection";
import CodeEditor from "./CodeEditor";
import VideoLesson from "./VideoLesson";
import PdfLesson from "./PdfLesson";
import type {
  ExerciseLessonContent,
  PdfLessonContent,
  VideoLessonContent,
} from "@/config/schema";

const SplitterLayout = dynamic(() => import("react-splitter-layout"), {
  ssr: false,
});

export type Lesson = {
  id: number;
  courseId: number;
  chapterId: number;
  slug: string;
  orderIndex: number;
  type: string; // 'video' | 'pdf' | 'exercise'
  title: string;
  xp: number;
  content: VideoLessonContent | PdfLessonContent | ExerciseLessonContent;
};

type Props = {
  lesson: Lesson | undefined;
  editorType?: string | null;
  isCompleted: boolean;
  loading: boolean;
  refreshData: () => void;
};

function LessonRenderer({ lesson, editorType, isCompleted, loading, refreshData }: Props) {
  const router = useRouter();

  const markCompleted = async () => {
    if (!lesson) return;
    try {
      await axios.post("/api/lesson/complete", { lessonId: lesson.id });
      toast.success("Lesson marked as completed!");
      refreshData();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark lesson as completed");
    }
  };

  if (!lesson) return null;

  if (lesson.type === "exercise") {
    const exerciseContent = lesson.content as ExerciseLessonContent;
    return (
      <SplitterLayout percentage primaryMinSize={40} secondaryMinSize={60}>
        <div className="h-full overflow-auto">
          <ContentSection title={lesson.title} content={exerciseContent} loading={loading} />
        </div>
        <div className="h-full">
          <CodeEditor
            lesson={{ id: lesson.id, title: lesson.title, content: exerciseContent }}
            editorType={editorType}
            isCompleted={isCompleted}
            refreshData={refreshData}
          />
        </div>
      </SplitterLayout>
    );
  }

  // Non-exercise lessons share a layout: media on the left, mark-complete CTA
  // along with title + description on the right.
  const mediaEl =
    lesson.type === "video" ? (
      <VideoLesson content={lesson.content as VideoLessonContent} title={lesson.title} />
    ) : (
      <PdfLesson content={lesson.content as PdfLessonContent} title={lesson.title} />
    );

  return (
    <div className="flex h-full">
      <div className="flex-1 h-full">{mediaEl}</div>
      <aside className="w-96 p-6 border-l-4 border-zinc-800 bg-zinc-950 flex flex-col gap-4">
        <h2 className="font-game text-3xl text-white">{lesson.title}</h2>
        <p className="font-game text-zinc-400">
          {lesson.type === "video"
            ? "Watch the lecture, then mark this lesson complete to earn XP."
            : "Read through the document, then mark this lesson complete to earn XP."}
        </p>
        <Button
          variant="pixel"
          size="lg"
          disabled={isCompleted}
          onClick={markCompleted}
          className="font-game text-xl mt-auto"
        >
          {isCompleted ? "Already Completed" : `Mark Completed (+${lesson.xp} XP)`}
        </Button>
      </aside>
    </div>
  );
}

export default LessonRenderer;
