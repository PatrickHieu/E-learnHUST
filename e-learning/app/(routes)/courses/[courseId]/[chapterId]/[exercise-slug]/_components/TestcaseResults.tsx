"use client";

import React from "react";
import { CheckCircle2, EyeOff, XCircle } from "lucide-react";

// Shared per-test pass/fail panel rendered by both the C/C++ and
// Python runners. Hidden cases only show pass/fail + name; visible
// cases also show stdin / expected / actual so the student can see
// the diff that needs fixing.
export type GradingCaseResult = {
  name: string;
  passed: boolean;
  hidden: boolean;
  status: string;
  time?: string;
  memoryKb?: number;
  input?: string;
  expected?: string;
  actual?: string;
  stderr?: string;
};

type Props = {
  totalCases: number;
  passedCases: number;
  results: GradingCaseResult[];
};

export default function TestcaseResults({ totalCases, passedCases, results }: Props) {
  if (results.length === 0) return null;
  const allPassed = passedCases === totalCases;
  return (
    <div className="flex flex-col gap-2 px-3 py-2 border-t border-zinc-900 max-h-72 overflow-y-auto">
      <div
        className={`text-xs font-game uppercase tracking-wider sticky top-0 bg-zinc-950 pb-1 ${
          allPassed ? "text-green-400" : "text-amber-400"
        }`}
      >
        Test cases: {passedCases} / {totalCases} passed
      </div>
      <ul className="flex flex-col gap-1">
        {results.map((r, i) => (
          <li
            key={i}
            className={`rounded-md border px-3 py-2 text-sm flex flex-col gap-1 ${
              r.passed
                ? "border-green-900/60 bg-green-950/30 text-green-200"
                : "border-red-900/60 bg-red-950/30 text-red-100"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-mono">
                {r.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                {r.name}
                {r.hidden && (
                  <span className="inline-flex items-center gap-1 text-zinc-400 text-xs">
                    <EyeOff className="w-3 h-3" /> hidden
                  </span>
                )}
              </span>
              <span className="text-xs text-zinc-400">
                {r.status}
                {r.time && ` · ${r.time}s`}
                {typeof r.memoryKb === "number" && ` · ${r.memoryKb} KB`}
              </span>
            </div>

            {!r.passed && !r.hidden && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1 text-xs">
                <Snippet label="Stdin" value={r.input} />
                <Snippet label="Expected" value={r.expected} />
                <Snippet label="Got" value={r.actual} stderr={r.stderr} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Snippet({
  label,
  value,
  stderr,
}: {
  label: string;
  value: string | undefined;
  stderr?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-zinc-500 uppercase tracking-wider">{label}</span>
      <pre className="font-mono whitespace-pre-wrap bg-zinc-950 border border-zinc-800 rounded p-2 max-h-32 overflow-auto text-zinc-100">
        {value && value.length > 0 ? value : <span className="text-zinc-600">(empty)</span>}
        {stderr ? `\n--- stderr ---\n${stderr}` : ""}
      </pre>
    </div>
  );
}
