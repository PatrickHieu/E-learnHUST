"use client";
import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CheckpointWithIndex } from "./CheckpointOverlay";

type Props = {
  durationSec: number;            // 0 while metadata is still loading
  checkpoints: CheckpointWithIndex[];
  completedIndexes: Set<number>;
};

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Thin strip rendered beneath the video player showing where each in-video
// quiz checkpoint will fire. Pending = yellow, already-passed = green.
// We render a separate strip rather than trying to overlay the browser /
// YouTube native timeline — those controls live in shadow DOM / a third-
// party iframe, so positioning dots on them precisely isn't feasible.
function CheckpointMarkers({ durationSec, checkpoints, completedIndexes }: Props) {
  if (checkpoints.length === 0) return null;
  return (
    <div className="w-full h-7 bg-zinc-900/80 px-3 flex items-center">
      <div className="relative w-full h-1.5 bg-zinc-700 rounded-full">
        {checkpoints.map((c) => {
          const completed = completedIndexes.has(c.originalIndex);
          // If duration isn't known yet, drop the dot at 0% — it'll snap
          // into place once the player emits metadata.
          const pct =
            durationSec > 0
              ? Math.min(100, Math.max(0, (c.timestamp / durationSec) * 100))
              : 0;
          return (
            <Tooltip key={c.originalIndex}>
              <TooltipTrigger asChild>
                <div
                  className={`absolute top-1/2 w-3 h-3 rounded-full border-2 border-zinc-900 ${
                    completed ? "bg-green-500" : "bg-yellow-400"
                  }`}
                  style={{
                    left: `${pct}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  aria-label={
                    completed
                      ? `Quiz at ${formatTime(c.timestamp)} — completed`
                      : `Quiz at ${formatTime(c.timestamp)} — +${c.xp} XP`
                  }
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-game text-sm">
                  Quiz at {formatTime(c.timestamp)} {completed ? "✓" : `(+${c.xp} XP)`}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

export default CheckpointMarkers;
