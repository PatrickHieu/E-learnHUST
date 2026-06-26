"use client";
import React, { useContext } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ContentSection from "./ContentSection";
import CodeEditor from "./CodeEditor";
import PythonRunner from "./PythonRunner";
import CppRunner from "./CppRunner";
import VideoLesson from "./VideoLesson";
import PdfLesson from "./PdfLesson";
import QuizLesson from "./QuizLesson";
import type {
  ExerciseLessonContent,
  PdfLessonContent,
  QuizLessonContent,
  VideoLessonContent,
} from "@/config/schema";
import { UserDetailContext } from "@/context/UserDetailContext";
import { useIsMobile } from "@/hooks/use-mobile";

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
  content: VideoLessonContent | PdfLessonContent | ExerciseLessonContent | QuizLessonContent;
};

type Props = {
  lesson: Lesson | undefined;
  editorType?: string | null;
  isCompleted: boolean;
  loading: boolean;
  refreshData: () => void;
  completedCheckpointIndexes?: number[];
  // Source the student submitted when they passed this lesson. The
  // exercise runner uses it as the initial editor value on revisit
  // so they can re-read their working solution instead of the empty
  // starter snippet.
  savedSubmission?: string | null;
};

function LessonRenderer({
  lesson,
  editorType,
  isCompleted,
  loading,
  refreshData,
  completedCheckpointIndexes = [],
  savedSubmission = null,
}: Props) {
  const router = useRouter();
  const { refreshUserDetail } = useContext(UserDetailContext);
  const isMobile = useIsMobile();

  const [marking, setMarking] = React.useState(false);

  const markCompleted = async () => {
    if (!lesson || marking) return;
    setMarking(true);
    try {
      const res = await axios.post<{ xpEarned?: number; alreadyCompleted?: boolean }>(
        "/api/lesson/complete",
        { lessonId: lesson.id },
      );
      const earned = res.data?.xpEarned ?? lesson.xp ?? 0;
      if (res.data?.alreadyCompleted) {
        toast.success("Already completed.");
      } else {
        toast.success(
          earned > 0
            ? `Lesson complete! +${earned} XP`
            : "Lesson marked as completed!",
        );
      }
      refreshData();
      await refreshUserDetail();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark lesson as completed");
    } finally {
      setMarking(false);
    }
  };

  const submitQuiz = async (selectedIndex: number) => {
    if (!lesson) return;
    try {
      await axios.post("/api/lesson/complete", {
        lessonId: lesson.id,
        submission: String(selectedIndex),
      });
      toast.success("Correct!");
      refreshData();
      await refreshUserDetail();
      router.refresh();
    } catch (err: any) {
      const reason = err?.response?.data?.reason;
      toast.error(reason ?? "Failed to submit quiz answer");
      // Re-throw so the QuizLesson component knows the submit didn't
      // succeed and stays in pick mode.
      throw err;
    }
  };

  if (!lesson) return null;

  if (lesson.type === "quiz") {
    return (
      <QuizLesson
        content={lesson.content as QuizLessonContent}
        isCompleted={isCompleted}
        onSubmit={submitQuiz}
      />
    );
  }

  if (lesson.type === "exercise") {
    const exerciseContent = lesson.content as ExerciseLessonContent;

    // Dispatch by editorType so each language uses the right runtime:
    // - python → Pyodide WASM in a Web Worker (in-browser, ~10MB first
    //   load then cached forever)
    // - c / cpp → Monaco + server-side Judge0 (set JUDGE0_RAPIDAPI_KEY
    //   in env; see app/api/code/run/route.ts)
    // - anything else → Sandpack handles HTML/CSS/JS family templates
    //   with a live iframe preview
    const exerciseLesson = {
      id: lesson.id,
      title: lesson.title,
      content: exerciseContent,
    };
    const t = (editorType ?? "").toLowerCase();
    let editorEl: React.ReactNode;
    if (t === "python") {
      editorEl = (
        <PythonRunner
          lesson={exerciseLesson}
          isCompleted={isCompleted}
          refreshData={refreshData}
          savedSubmission={savedSubmission}
        />
      );
    } else if (t === "c" || t === "cpp" || t === "c++") {
      editorEl = (
        <CppRunner
          lesson={exerciseLesson}
          language={t === "c" ? "c" : "cpp"}
          isCompleted={isCompleted}
          refreshData={refreshData}
          savedSubmission={savedSubmission}
        />
      );
    } else {
      editorEl = (
        <CodeEditor
          lesson={exerciseLesson}
          editorType={editorType}
          isCompleted={isCompleted}
          refreshData={refreshData}
        />
      );
    }

    // SplitterLayout's horizontal split collapses both panes into unusable
    // widths on phones. Below md we stack: prompt above, editor below.
    if (isMobile) {
      return (
        <div className="h-full overflow-auto flex flex-col">
          <div className="border-b-4 border-zinc-800">
            <ContentSection title={lesson.title} content={exerciseContent} loading={loading} />
          </div>
          <div className="min-h-[60vh]">{editorEl}</div>
        </div>
      );
    }
    return (
      <SplitterLayout percentage primaryMinSize={40} secondaryMinSize={60}>
        <div className="h-full overflow-auto">
          <ContentSection title={lesson.title} content={exerciseContent} loading={loading} />
        </div>
        <div className="h-full">{editorEl}</div>
      </SplitterLayout>
    );
  }

  // Video / PDF: media on top + sidebar on the right (desktop) → stacked
  // vertically with media first (mobile).
  const videoContent = lesson.type === "video" ? (lesson.content as VideoLessonContent) : null;
  const hasInVideoQuizzes = (videoContent?.inVideoQuizzes?.length ?? 0) > 0;

  // Auto-complete videos with checkpoints — the server lights up
  // completedLesson when the last checkpoint passes, so we just need to
  // refresh after the overlay tells us it happened.
  const onVideoAutoComplete = async () => {
    refreshData();
    await refreshUserDetail();
    router.refresh();
  };

  const mediaEl =
    lesson.type === "video" && videoContent ? (
      <VideoLesson
        content={videoContent}
        title={lesson.title}
        lessonId={lesson.id}
        completedCheckpointIndexes={completedCheckpointIndexes}
        onLessonComplete={onVideoAutoComplete}
      />
    ) : (
      <PdfLesson content={lesson.content as PdfLessonContent} title={lesson.title} />
    );

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="flex-1 min-h-[40vh] md:min-h-0 md:h-full">{mediaEl}</div>
      <aside className="w-full md:w-96 p-6 pb-24 md:pb-24 md:border-l-4 md:border-t-0 border-t-4 border-zinc-800 bg-zinc-950 flex flex-col gap-4 overflow-y-auto">
        <h2 className="font-game text-3xl text-white">{lesson.title}</h2>
        <p className="font-game text-zinc-400">
          {hasInVideoQuizzes
            ? "Answer the in-video checkpoint quizzes correctly to finish this lesson."
            : lesson.type === "video"
            ? "Watch the lecture, then mark this lesson complete to earn XP."
            : "Read through the document, then mark this lesson complete to earn XP."}
        </p>

        {/* Videos with checkpoints auto-complete on the last correct
            answer; show a finished-state pill instead of the manual
            Mark Completed button so the student isn't tempted to skip
            the quizzes. */}
        {hasInVideoQuizzes ? (
          isCompleted && (
            <div className="font-game text-xl text-green-400 mt-auto">
              Lesson completed.
            </div>
          )
        ) : isCompleted ? (
          <div className="mt-auto flex flex-col gap-2 p-4 border-2 border-green-500 rounded-xl bg-green-500/10">
            <p className="font-game text-2xl text-green-300">Lesson completed</p>
            <p className="font-game text-sm text-green-200/80">
              +{lesson.xp} XP earned. Use Next to continue.
            </p>
          </div>
        ) : (
          <Button
            variant="pixel"
            size="lg"
            disabled={marking}
            onClick={markCompleted}
            className="font-game text-xl md:mt-auto"
          >
            {marking ? "Saving…" : `Mark Completed (+${lesson.xp} XP)`}
          </Button>
        )}
      </aside>
    </div>
  );
}

export default LessonRenderer;
