"use client";
import React, { useRef, useState } from "react";
import { toast } from "sonner";
import type { VideoQuizCheckpoint } from "@/config/schema";
import CheckpointOverlay, { CheckpointWithIndex } from "./CheckpointOverlay";
import CheckpointMarkers from "./CheckpointMarkers";

type Props = {
  url: string;
  title: string;
  lessonId: number;
  checkpoints: VideoQuizCheckpoint[];
  initiallyCompletedIndexes: number[];
  onLessonComplete: () => void;
};

function NativeVideoWithCheckpoints({
  url,
  title,
  lessonId,
  checkpoints,
  initiallyCompletedIndexes,
  onLessonComplete,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Filter out checkpoints with non-positive timestamps. The admin
  // form's default value is 0 — an unsaved/empty field shouldn't
  // trigger the moment the video loads. Sort the rest by timestamp
  // so .find() reliably returns the earliest uncompleted one when
  // the student scrubs past several markers at once.
  const ordered: CheckpointWithIndex[] = React.useMemo(
    () =>
      checkpoints
        .map((c, originalIndex) => ({ ...c, originalIndex }))
        .filter((c) => c.timestamp > 0)
        .sort((a, b) => a.timestamp - b.timestamp),
    [checkpoints],
  );

  const [completed, setCompleted] = useState<Set<number>>(
    () => new Set(initiallyCompletedIndexes),
  );
  const [activeCheckpoint, setActiveCheckpoint] = useState<CheckpointWithIndex | null>(null);
  const [duration, setDuration] = useState(0);

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
    }
  }

  return (
    <div className="relative w-full h-full bg-black flex flex-col">
      <div className="relative flex-1 min-h-0 bg-black">
        <video
          ref={videoRef}
          controls
          className="w-full h-full bg-black"
          src={url}
          aria-label={title}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() =>
            setDuration(videoRef.current?.duration ?? 0)
          }
        />

        {ordered.length > 0 && !activeCheckpoint && (
          <div className="pointer-events-none absolute top-3 right-3 px-3 py-1 rounded-full bg-black/70 text-white font-game text-sm">
            {completed.size}/{ordered.length} quizzes
          </div>
        )}
      </div>

      <CheckpointMarkers
        durationSec={duration}
        checkpoints={ordered}
        completedIndexes={completed}
      />

      {activeCheckpoint && (
        <CheckpointOverlay
          checkpoint={activeCheckpoint}
          lessonId={lessonId}
          completedCount={completed.size}
          totalCount={ordered.length}
          onCorrect={(res) => {
            setCompleted((prev) => {
              const next = new Set(prev);
              next.add(activeCheckpoint.originalIndex);
              return next;
            });
            setActiveCheckpoint(null);

            if (res.lessonCompleted) {
              toast.success(`Lesson complete! +${res.checkpointXp} XP`);
              onLessonComplete();
            } else {
              if (res.checkpointXp > 0) {
                toast.success(`Correct! +${res.checkpointXp} XP`);
              }
              videoRef.current?.play().catch(() => {
                // Browsers can block programmatic play after the focus
                // wanders. Controls stay visible so the student can
                // resume manually.
              });
            }
          }}
        />
      )}
    </div>
  );
}

export default NativeVideoWithCheckpoints;
