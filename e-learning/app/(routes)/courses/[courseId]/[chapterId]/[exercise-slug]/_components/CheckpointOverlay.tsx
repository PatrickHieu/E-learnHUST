"use client";
import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { VideoQuizCheckpoint } from "@/config/schema";
import { sanitizeLessonHtml } from "@/lib/sanitize";

export type CheckpointWithIndex = VideoQuizCheckpoint & { originalIndex: number };

type CorrectResponse = {
  lessonCompleted: boolean;
  checkpointXp: number;
  alreadyCompleted: boolean;
};

type Props = {
  checkpoint: CheckpointWithIndex;
  lessonId: number;
  completedCount: number;     // how many checkpoints already done (before this)
  totalCount: number;
  // Called on a server-confirmed correct answer. Parent decides what to
  // do next (typically: add to its completed-set, dismiss overlay,
  // resume playback or fire onLessonComplete).
  onCorrect: (response: CorrectResponse) => void;
};

// Pure presentation + submit-logic for one in-video quiz checkpoint.
// Owns the radio selection / wrong-pick / submitting state so the parent
// player components (native + youtube) don't have to duplicate it.
function CheckpointOverlay({ checkpoint, lessonId, completedCount, totalCount, onCorrect }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (selected === null) return;
    setSubmitting(true);
    try {
      const res = await axios.post<CorrectResponse>("/api/video-quiz/complete", {
        lessonId,
        checkpointIndex: checkpoint.originalIndex,
        submission: String(selected),
      });
      onCorrect(res.data);
    } catch (err: any) {
      const reason = err?.response?.data?.reason ?? "Try again";
      toast.error(reason);
      setWrongPick(selected);
    } finally {
      setSubmitting(false);
    }
  }

  const remaining = totalCount - completedCount - 1;

  return (
    <div className="absolute inset-0 bg-black/85 flex items-center justify-center p-4 md:p-10 z-10">
      <div className="w-full max-w-2xl flex flex-col gap-5 font-sans bg-zinc-950 border-4 border-yellow-400 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <span className="font-game text-sm text-yellow-300 uppercase">
            Quiz checkpoint
          </span>
          <span className="font-game text-xs text-zinc-500">
            {completedCount + 1} / {totalCount} · {remaining < 0 ? 0 : remaining} after this
          </span>
        </div>

        <div
          className="font-game text-xl text-white"
          dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(checkpoint.question) }}
        />

        <div className="flex flex-col gap-2">
          {checkpoint.options.map((opt, i) => {
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
          onClick={submit}
        >
          {submitting ? "Checking…" : "Submit"}
        </Button>
      </div>
    </div>
  );
}

export default CheckpointOverlay;
