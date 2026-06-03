"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import type { VideoQuizCheckpoint } from "@/config/schema";

type Props = {
  checkpoints: VideoQuizCheckpoint[];
  onChange: (next: VideoQuizCheckpoint[]) => void;
};

function emptyCheckpoint(): VideoQuizCheckpoint {
  return {
    timestamp: 0,
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    xp: 5,
  };
}

// Editor for the in-video quiz checkpoint list. Shared between the
// create and edit lesson forms; both serialise the array as JSON via a
// hidden input so the server action can JSON.parse it without dealing
// with FormData's flat field-name encoding.
export default function CheckpointsEditor({ checkpoints, onChange }: Props) {
  function update(index: number, patch: Partial<VideoQuizCheckpoint>) {
    onChange(checkpoints.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }
  function updateOption(index: number, optIdx: number, value: string) {
    const next = [...checkpoints];
    const opts = [...next[index].options];
    opts[optIdx] = value;
    next[index] = { ...next[index], options: opts };
    onChange(next);
  }
  function add() {
    onChange([...checkpoints, emptyCheckpoint()]);
  }
  function remove(index: number) {
    onChange(checkpoints.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">In-video quiz checkpoints</label>
          <p className="text-xs text-zinc-500">
            Optional. Pause the video at a timestamp and quiz the student before
            playback resumes. Each correct answer credits its own XP.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-2">
          <Plus className="w-4 h-4" /> Add checkpoint
        </Button>
      </div>

      {checkpoints.length === 0 ? (
        <div className="text-sm text-zinc-500 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md p-4 text-center">
          No checkpoints yet. This video will play through with no quiz pauses.
        </div>
      ) : (
        checkpoints.map((cp, i) => (
          <div
            key={i}
            className="border border-zinc-200 dark:border-zinc-700 rounded-md p-4 flex flex-col gap-4 bg-zinc-50 dark:bg-zinc-900/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Checkpoint #{i + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 h-8 w-8"
                aria-label="Remove checkpoint"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Timestamp (sec) *</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={cp.timestamp}
                  onChange={(e) =>
                    update(i, { timestamp: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
                <p className="text-xs text-zinc-500">e.g. 90 = 1:30</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">XP reward *</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={cp.xp}
                  onChange={(e) =>
                    update(i, { xp: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Question (HTML) *</label>
              <Textarea
                className="h-20 font-mono text-sm"
                value={cp.question}
                onChange={(e) => update(i, { question: e.target.value })}
                placeholder="<p>What did the narrator say first?</p>"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium">Options *</label>
              {[0, 1, 2, 3].map((optIdx) => (
                <div key={optIdx} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`cp-${i}-correct`}
                      checked={cp.correctIndex === optIdx}
                      onChange={() => update(i, { correctIndex: optIdx })}
                      className="w-4 h-4"
                    />
                    <span className="w-4 text-zinc-500">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                  </label>
                  <Input
                    value={cp.options[optIdx] ?? ""}
                    onChange={(e) => updateOption(i, optIdx, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                  />
                </div>
              ))}
              <p className="text-xs text-zinc-500">
                Tick the radio next to the correct answer.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Explanation (HTML)</label>
              <Textarea
                className="h-16 font-mono text-sm"
                value={cp.explanation ?? ""}
                onChange={(e) =>
                  update(i, { explanation: e.target.value || undefined })
                }
                placeholder="Optional. Shown after the student answers correctly."
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
