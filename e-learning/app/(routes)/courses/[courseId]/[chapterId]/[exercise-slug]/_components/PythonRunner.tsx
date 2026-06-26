"use client";

import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";
import type { ExerciseLessonContent } from "@/config/schema";
import { validateExerciseSubmission } from "@/lib/lesson-validation";
import { UserDetailContext } from "@/context/UserDetailContext";
import TestcaseResults, { type GradingCaseResult } from "./TestcaseResults";

// Monaco is heavy and not SSR-safe — load it lazily on the client.
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-sm text-zinc-500">
      Loading editor…
    </div>
  ),
});

type LessonExercise = {
  id: number;
  title: string;
  content: ExerciseLessonContent;
};

type Props = {
  lesson: LessonExercise;
  isCompleted: boolean;
  refreshData?: () => void;
  // When the student previously completed this lesson, their winning
  // source is replayed into the editor instead of the starter.
  savedSubmission?: string | null;
};

// Picks an initial Python snippet from the lesson's starterCode map.
// The admin form stores starter code keyed by filename — for Python
// the convention is /main.py but we accept any *.py key.
function pickStarter(starterCode: Record<string, string>): string {
  const pyKey = Object.keys(starterCode).find((k) => k.endsWith(".py"));
  if (pyKey) return starterCode[pyKey];
  // Fall back to the first entry so a lesson seeded under the old
  // /index.html convention still shows something editable.
  const firstKey = Object.keys(starterCode)[0];
  return firstKey ? starterCode[firstKey] : "# Write your Python here\n";
}

function PythonRunner({
  lesson,
  isCompleted,
  refreshData,
  savedSubmission,
}: Props) {
  const router = useRouter();
  const { refreshUserDetail } = useContext(UserDetailContext);
  const [source, setSource] = useState(() =>
    savedSubmission && savedSubmission.length > 0
      ? savedSubmission
      : pickStarter(lesson.content.starterCode),
  );
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "running">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<{
    pass: boolean;
    totalCases: number;
    passedCases: number;
    results: GradingCaseResult[];
  } | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const hasTestcases = Boolean(
    lesson.content.testcases && lesson.content.testcases.length > 0,
  );

  // Lazy-spawn the worker the first time the learner clicks Run so the
  // 10MB Pyodide download doesn't fire on a passive page view.
  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const w = new Worker("/python-worker.js");
    w.onmessage = (event) => {
      const { type, data } = event.data ?? {};
      if (type === "loading") setStatus("loading");
      else if (type === "ready") setStatus("ready");
      else if (type === "stdout") setOutput((s) => s + (data ?? ""));
      else if (type === "stderr") setOutput((s) => s + (data ?? ""));
      else if (type === "result") {
        setStatus("ready");
        if (data) setOutput((s) => s + (s && !s.endsWith("\n") ? "\n" : "") + data);
      } else if (type === "error") {
        setStatus("ready");
        setOutput((s) => s + `\nError: ${data ?? "Execution failed"}\n`);
      }
    };
    workerRef.current = w;
    return w;
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  function runCode() {
    setOutput("");
    setStatus("running");
    const w = ensureWorker();
    w.postMessage({ type: "run", code: source });
  }

  // Trial-run test cases server-side via Judge0 (python language_id=71).
  // Pyodide runs the editor's Run button locally for fast feedback,
  // but grading goes through the server so the same sandbox + same
  // limits apply to every learner regardless of browser quirks.
  async function handleRunTestcases() {
    if (grading) return;
    setGradeResult(null);
    setGrading(true);
    try {
      const res = await axios.post<{
        pass: boolean;
        totalCases: number;
        passedCases: number;
        results: GradingCaseResult[];
      }>("/api/code/grade", { lessonId: lesson.id, source, language: "python" });
      setGradeResult(res.data);
      if (res.data.pass) {
        toast.success(`All ${res.data.totalCases} test cases passed!`);
      } else {
        toast.error(
          `${res.data.passedCases}/${res.data.totalCases} test cases passed`,
        );
      }
    } catch (err: any) {
      const detail = err?.response?.data;
      const hint = detail?.hint ? `\n${detail.hint}` : "";
      toast.error((detail?.error ?? err.message) + hint);
    } finally {
      setGrading(false);
    }
  }

  async function handleMarkCompleted() {
    if (submitting) return;
    // For lessons without test cases the legacy regex check still
    // applies; for lessons with test cases the server-side grader is
    // the gate and the local check is a no-op.
    if (!hasTestcases) {
      const local = validateExerciseSubmission(lesson.content, source);
      if (!local.pass) {
        toast.error(local.reason);
        return;
      }
    }
    setSubmitting(true);
    try {
      await axios.post("/api/lesson/complete", {
        lessonId: lesson.id,
        submission: source,
      });
      toast.success("Lesson marked as completed!");
      if (refreshData) await refreshData();
      await refreshUserDetail();
      router.refresh();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.grading?.results) {
        setGradeResult(data.grading);
      }
      const reason = data?.reason;
      toast.error(reason ?? "Failed to mark lesson as completed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          defaultLanguage="python"
          theme="vs-dark"
          value={source}
          onChange={(v) => setSource(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      <div className="shrink-0 border-t-2 border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-zinc-900">
          <span className="font-game text-xs uppercase tracking-wider text-zinc-500">
            Output
            {status === "loading" && " · loading Python runtime…"}
            {status === "running" && " · running…"}
          </span>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="pixel"
              size="sm"
              onClick={runCode}
              disabled={status === "loading" || status === "running"}
              className="font-game gap-2"
            >
              {status === "loading" || status === "running" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run
            </Button>
            {hasTestcases && (
              <Button
                variant="pixel"
                size="sm"
                onClick={handleRunTestcases}
                disabled={grading}
                className="font-game gap-2"
              >
                {grading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Run Test Cases
              </Button>
            )}
            <Button
              variant="pixel"
              size="sm"
              disabled={isCompleted || submitting}
              className="bg-[#a3e534] font-game"
              onClick={handleMarkCompleted}
            >
              {isCompleted ? "Already Completed!" : "Mark Completed!"}
            </Button>
          </div>
        </div>
        <pre className="font-mono text-sm text-zinc-200 px-3 py-2 max-h-48 overflow-y-auto whitespace-pre-wrap">
          {output || (
            <span className="text-zinc-600">
              Click Run to execute. Output and errors appear here.
            </span>
          )}
        </pre>
        {gradeResult && (
          <TestcaseResults
            totalCases={gradeResult.totalCases}
            passedCases={gradeResult.passedCases}
            results={gradeResult.results}
          />
        )}
      </div>
    </div>
  );
}

export default PythonRunner;
