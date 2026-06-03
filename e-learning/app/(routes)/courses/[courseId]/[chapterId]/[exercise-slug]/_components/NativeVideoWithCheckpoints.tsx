"use client";
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import type { VideoQuizCheckpoint } from "@/config/schema";
import { sanitizeLessonHtml } from "@/lib/sanitize";

type Props = {
  url: string;
  title: string;
  lessonId: number;
  checkpoints: VideoQuizCheckpoint[];
  // Indexes the student has already passed in earlier sessions — passed
  // by the parent so the player doesn't interrupt the same spots after a
  // reload.
  initiallyCompletedIndexes: number[];
  onLessonComplete: () => void;
};

type CheckpointWithIndex = VideoQuizCheckpoint & { originalIndex: number };

function NativeVideoWithCheckpoints({
  url,
  title,
  lessonId,
  checkpoints,
  initiallyCompletedIndexes,
  onLessonComplete,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sorted timestamp order, keeping the original schema indexes.
  const ordered: CheckpointWithIndex[] = React.useMemo(
    () =>
      checkpoints
        .map((c, originalIndex) => ({ ...c, originalIndex }))
        .sort((a, b) => a.timestamp - b.timestamp),
    [checkpoints],
  );

  const [completed, setCompleted] = useState<Set<number>>(
    () => new Set(initiallyCompletedIndexes),
  );
  const [activeCheckpoint, setActiveCheckpoint] = useState<CheckpointWithIndex | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // timeupdate fires ~4 times/sec on most browsers — cheap enough to scan
  // the small checkpoint array each time.
  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v || activeCheckpoint) return;
    const now = v.currentTime;
    const due = ordered.find(
      (c) => !completed.has(c.originalIndex) && now >= c.timestamp,
    );
    if (due) {
      v.pause();
      setActiveCheckpoint(due);
      setSelected(null);
      setWrongPick(null);
    }
  }

  async function submitAnswer() {
    if (!activeCheckpoint || selected === null) return;
    setSubmitting(true);
    try {
      const res = await axios.post<{
        lessonCompleted: boolean;
        checkpointXp: number;
        alreadyCompleted: boolean;
      }>("/api/video-quiz/complete", {
        lessonId,
        checkpointIndex: activeCheckpoint.originalIndex,
        submission: String(selected),
      });

      // Server agreed — record locally, dismiss overlay, resume.
      setCompleted((prev) => {
        const next = new Set(prev);
        next.add(activeCheckpoint.originalIndex);
        return next;
      });
      setActiveCheckpoint(null);

      if (res.data.lessonCompleted) {
        toast.success(`Lesson complete! +${res.data.checkpointXp} XP`);
        onLessonComplete();
        // Don't auto-resume; the lesson is done.
      } else {
        if (res.data.checkpointXp > 0) {
          toast.success(`Correct! +${res.data.checkpointXp} XP`);
        }
        videoRef.current?.play().catch(() => {
          // Some browsers block programmatic play after user interaction
          // away from the element — fine, the controls stay visible.
        });
      }
    } catch (err: any) {
      const reason = err?.response?.data?.reason ?? "Try again";
      toast.error(reason);
      setWrongPick(selected);
    } finally {
      setSubmitting(false);
    }
  }

  const remaining = ordered.length - completed.size;

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        controls
        className="w-full h-full bg-black"
        src={url}
        aria-label={title}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Small progress chip top-right so the student sees the gates ahead */}
      {ordered.length > 0 && !activeCheckpoint && (
        <div className="pointer-events-none absolute top-3 right-3 px-3 py-1 rounded-full bg-black/70 text-white font-game text-sm">
          {completed.size}/{ordered.length} quizzes
        </div>
      )}

      {activeCheckpoint && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center p-4 md:p-10">
          <div className="w-full max-w-2xl flex flex-col gap-5 font-sans bg-zinc-950 border-4 border-yellow-400 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <span className="font-game text-sm text-yellow-300 uppercase">
                Quiz checkpoint
              </span>
              <span className="font-game text-xs text-zinc-500">
                {completed.size + 1} / {ordered.length} · {remaining - 1 < 0 ? 0 : remaining - 1} after this
              </span>
            </div>

            <div
              className="font-game text-xl text-white"
              dangerouslySetInnerHTML={{
                __html: sanitizeLessonHtml(activeCheckpoint.question),
              }}
            />

            <div className="flex flex-col gap-2">
              {activeCheckpoint.options.map((opt, i) => {
                const isPicked = selected === i;
                const isWrong = wrongPick === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (submitting) return;
                      setSelected(i);
                      if (wrongPick !== null) setWrongPick(null);
                    }}
                    disabled={submitting}
                    className={`text-left p-3 rounded-xl border-2 font-game text-base flex items-center gap-3 transition-colors ${
                      isWrong
                        ? "border-red-500 bg-red-500/10"
                        : isPicked
                        ? "border-yellow-400 bg-yellow-400/10"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                  >
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 text-xs">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {isWrong && <X className="w-4 h-4 text-red-400" />}
                  </button>
                );
              })}
            </div>

            <Button
              variant="pixel"
              size="lg"
              className="font-game text-xl self-end mt-2"
              disabled={selected === null || submitting}
              onClick={submitAnswer}
            >
              {submitting ? "Checking…" : "Submit"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NativeVideoWithCheckpoints;
