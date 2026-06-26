"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import type { ExerciseTestCase } from "@/config/schema";

type Props = {
  testcases: ExerciseTestCase[];
  onChange: (next: ExerciseTestCase[]) => void;
};

function emptyTestcase(): ExerciseTestCase {
  return {
    name: "",
    input: "",
    expectedOutput: "",
    hidden: false,
  };
}

// Editor for the stdin / stdout test cases that drive output-based
// grading for C, C++ and Python lessons. Serialises as JSON via a
// hidden input alongside the other lesson fields so the create / edit
// server actions can JSON.parse it without dealing with FormData's
// nested key encoding.
//
// A `hidden` test case is run by the grader but its input / expected
// text is never sent to the client — students only see whether it
// passed. Use this for spot-check inputs that would let a learner
// reverse-engineer a hard-coded answer.
export default function TestcasesEditor({ testcases, onChange }: Props) {
  function update(index: number, patch: Partial<ExerciseTestCase>) {
    onChange(testcases.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }
  function add() {
    onChange([...testcases, emptyTestcase()]);
  }
  function remove(index: number) {
    onChange(testcases.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Test cases (stdin → stdout)</label>
          <p className="text-xs text-zinc-500">
            For C / C++ / Python lessons. The grader runs the student program
            against each case via Judge0, compares stdout (whitespace-normalised)
            to the expected output, and only credits XP when every case passes.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-2">
          <Plus className="w-4 h-4" /> Add test case
        </Button>
      </div>

      {testcases.length === 0 ? (
        <div className="text-sm text-zinc-500 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md p-4 text-center">
          No test cases yet. The lesson will fall back to the regex / expected-output
          source-code check defined below.
        </div>
      ) : (
        testcases.map((tc, i) => (
          <div
            key={i}
            className="border border-zinc-200 dark:border-zinc-700 rounded-md p-4 flex flex-col gap-3 bg-zinc-50 dark:bg-zinc-900/40"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Test #{i + 1}</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(tc.hidden)}
                    onChange={(e) => update(i, { hidden: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Hidden
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(i)}
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 h-8 w-8"
                  aria-label="Remove test case"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Name (optional)</label>
              <Input
                value={tc.name ?? ""}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="e.g. small input"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Stdin</label>
                <Textarea
                  className="h-24 font-mono text-sm"
                  value={tc.input}
                  onChange={(e) => update(i, { input: e.target.value })}
                  placeholder={"3\n1 2 3"}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Expected stdout</label>
                <Textarea
                  className="h-24 font-mono text-sm"
                  value={tc.expectedOutput}
                  onChange={(e) => update(i, { expectedOutput: e.target.value })}
                  placeholder="6"
                />
              </div>
            </div>
          </div>
        ))
      )}

      <p className="text-xs text-zinc-500">
        Whitespace handling: trailing spaces on each line and trailing blank
        lines are stripped before comparison. CRLF and LF are treated as the
        same line ending.
      </p>
    </div>
  );
}
