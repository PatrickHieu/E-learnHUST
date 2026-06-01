"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import type { QuizLessonContent } from "@/config/schema";
import { sanitizeLessonHtml } from "@/lib/sanitize";

type Props = {
  content: QuizLessonContent;
  isCompleted: boolean;
  onSubmit: (selectedIndex: number) => Promise<void>;
};

function QuizLesson({ content, isCompleted, onSubmit }: Props) {
  const [selected, setSelected] = useState<number | null>(
    isCompleted ? content.correctIndex : null,
  );
  // Once the student answers, lock the question and reveal correctness +
  // explanation. The Mark Completed call only fires on a CORRECT answer,
  // so revealed === isCompleted in practice.
  const [revealed, setRevealed] = useState(isCompleted);
  const [submitting, setSubmitting] = useState(false);
  const [wrongPick, setWrongPick] = useState<number | null>(null);

  const isCorrect = selected !== null && selected === content.correctIndex;

  async function handleSubmit() {
    if (selected === null || revealed) return;
    setSubmitting(true);
    try {
      // The server validates regardless of what the client thinks. Success
      // → revealed. Failure (server 422, parent re-throws) → mark which
      // option they picked so the UI shows it as wrong but stay in
      // pickable state so they can retry.
      await onSubmit(selected);
      setRevealed(true);
      setWrongPick(null);
    } catch {
      setWrongPick(selected);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-10 flex flex-col gap-6 font-sans">
      <div
        className="prose dark:prose-invert font-game text-2xl"
        dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(content.question) }}
      />

      <div className="flex flex-col gap-3">
        {content.options.map((opt, i) => {
          const isPicked = selected === i;
          const isThisCorrect = revealed && i === content.correctIndex;
          const isThisWrong = revealed
            ? isPicked && i !== content.correctIndex
            : wrongPick === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (revealed) return;
                setSelected(i);
                if (wrongPick !== null) setWrongPick(null);
              }}
              disabled={revealed}
              className={`text-left p-4 rounded-xl border-4 font-game text-xl transition-colors flex items-center gap-3 ${
                isThisCorrect
                  ? "border-green-500 bg-green-500/10"
                  : isThisWrong
                  ? "border-red-500 bg-red-500/10"
                  : isPicked
                  ? "border-yellow-400 bg-yellow-400/10"
                  : "border-zinc-700 hover:border-zinc-500"
              }`}
            >
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 text-sm">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {isThisCorrect && <Check className="w-5 h-5 text-green-400" />}
              {isThisWrong && <X className="w-5 h-5 text-red-400" />}
            </button>
          );
        })}
      </div>

      {revealed && isCorrect && content.explanation && (
        <div
          className="font-game text-lg p-4 border-2 border-green-700/50 bg-green-950/30 rounded-xl"
          dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(content.explanation) }}
        />
      )}

      {!revealed && (
        <Button
          variant="pixel"
          size="lg"
          className="font-game text-2xl self-start mt-2"
          disabled={selected === null || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Checking…" : "Submit Answer"}
        </Button>
      )}

      {revealed && (
        <div className="font-game text-2xl text-green-400">
          Correct! Lesson completed.
        </div>
      )}
    </div>
  );
}

export default QuizLesson;
