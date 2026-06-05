"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import type { VideoQuizCheckpoint } from "@/config/schema";
import { loadYouTubeApi, type YouTubePlayer } from "@/lib/youtube-api";
import CheckpointOverlay, { CheckpointWithIndex } from "./CheckpointOverlay";

type Props = {
  videoId: string;
  title: string;
  lessonId: number;
  checkpoints: VideoQuizCheckpoint[];
  initiallyCompletedIndexes: number[];
  onLessonComplete: () => void;
};

// YouTube IFrame Player API doesn't emit per-second time updates the way
// <video>'s timeupdate event does, so we poll currentTime ourselves.
// 4Hz is fine for "did we cross a checkpoint timestamp" semantics.
const POLL_INTERVAL_MS = 250;

function YouTubeWithCheckpoints({
  videoId,
  title,
  lessonId,
  checkpoints,
  initiallyCompletedIndexes,
  onLessonComplete,
}: Props) {
  const mountId = useId().replace(/:/g, "");
  const playerDivId = `yt-player-${mountId}`;
  const playerRef = useRef<YouTubePlayer | null>(null);

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

  // Refs mirror state so the polling interval, which only mounts once,
  // can read the latest values without being re-created on every change.
  const completedRef = useRef(completed);
  const activeRef = useRef(activeCheckpoint);
  const orderedRef = useRef(ordered);
  useEffect(() => { completedRef.current = completed; }, [completed]);
  useEffect(() => { activeRef.current = activeCheckpoint; }, [activeCheckpoint]);
  useEffect(() => { orderedRef.current = ordered; }, [ordered]);

  useEffect(() => {
    let cancelled = false;
    let pollInterval: number | undefined;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        playerRef.current = new YT.Player(playerDivId, {
          videoId,
          playerVars: {
            // Keep YouTube branding visible (modestbranding is deprecated;
            // we just rely on the default chrome).
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              pollInterval = window.setInterval(() => {
                const player = playerRef.current;
                if (!player || activeRef.current) return;
                let now: number;
                try {
                  now = player.getCurrentTime();
                } catch {
                  return; // player gone / not ready
                }
                const due = orderedRef.current.find(
                  (c) => !completedRef.current.has(c.originalIndex) && now >= c.timestamp,
                );
                if (due) {
                  player.pauseVideo();
                  setActiveCheckpoint(due);
                }
              }, POLL_INTERVAL_MS);
            },
          },
        });
      })
      .catch((err) => {
        console.error("Failed to load YouTube API:", err);
      });

    return () => {
      cancelled = true;
      if (pollInterval) window.clearInterval(pollInterval);
      try {
        playerRef.current?.destroy();
      } catch {
        // Player may already be torn down; ignore.
      }
      playerRef.current = null;
    };
    // Only re-mount the player when the underlying video changes.
    // Checkpoint changes go through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* YT.Player replaces this div with the iframe on mount. */}
      <div id={playerDivId} className="w-full h-full" aria-label={title} />

      {ordered.length > 0 && !activeCheckpoint && (
        <div className="pointer-events-none absolute top-3 right-3 px-3 py-1 rounded-full bg-black/70 text-white font-game text-sm">
          {completed.size}/{ordered.length} quizzes
        </div>
      )}

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
              try {
                playerRef.current?.playVideo();
              } catch {
                // Player gone; ignore.
              }
            }
          }}
        />
      )}
    </div>
  );
}

export default YouTubeWithCheckpoints;
