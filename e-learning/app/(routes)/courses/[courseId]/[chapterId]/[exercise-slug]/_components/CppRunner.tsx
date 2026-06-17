"use client";

import React, { useContext, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";
import type { ExerciseLessonContent } from "@/config/schema";
import { validateExerciseSubmission } from "@/lib/lesson-validation";
import { UserDetailContext } from "@/context/UserDetailContext";

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
  language: "c" | "cpp";
  isCompleted: boolean;
  refreshData?: () => void;
};

function pickStarter(
  starterCode: Record<string, string>,
  language: "c" | "cpp",
): string {
  const suffixes = language === "c" ? [".c"] : [".cpp", ".cxx", ".cc"];
  const key = Object.keys(starterCode).find((k) =>
    suffixes.some((s) => k.endsWith(s)),
  );
  if (key) return starterCode[key];
  const firstKey = Object.keys(starterCode)[0];
  return firstKey
    ? starterCode[firstKey]
    : language === "c"
    ? "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, world!\\n\");\n    return 0;\n}\n"
    : "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, world!\\n\";\n    return 0;\n}\n";
}

function CppRunner({ lesson, language, isCompleted, refreshData }: Props) {
  const router = useRouter();
  const { refreshUserDetail } = useContext(UserDetailContext);
  const [source, setSource] = useState(() =>
    pickStarter(lesson.content.starterCode, language),
  );
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function runCode() {
    if (running) return;
    setOutput("");
    setRunning(true);
    try {
      const res = await axios.post<{
        stdout: string;
        stderr: string;
        status: string;
        time?: string;
        memory?: number;
      }>("/api/code/run", { language, source, stdin });
      const parts: string[] = [];
      if (res.data.stdout) parts.push(res.data.stdout);
      if (res.data.stderr) parts.push(res.data.stderr);
      const meta = res.data.time
        ? `\n— ${res.data.status} · ${res.data.time}s · ${res.data.memory ?? 0} KB`
        : `\n— ${res.data.status}`;
      setOutput(parts.join("\n") + meta);
    } catch (err: any) {
      const detail = err?.response?.data;
      // 503 means the operator hasn't set JUDGE0_RAPIDAPI_KEY yet. The
      // hint we ship from the server explains how — surface it directly
      // so the admin sees actionable text instead of a generic toast.
      const hint = detail?.hint ? `\n\nHint: ${detail.hint}` : "";
      setOutput(`Error: ${detail?.error ?? err.message}${hint}`);
    } finally {
      setRunning(false);
    }
  }

  async function handleMarkCompleted() {
    if (submitting) return;
    const local = validateExerciseSubmission(lesson.content, source);
    if (!local.pass) {
      toast.error(local.reason);
      return;
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
      const reason = err?.response?.data?.reason;
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
          defaultLanguage={language === "c" ? "c" : "cpp"}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-3 py-2 border-b border-zinc-900">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-game uppercase tracking-wider text-zinc-500">
              Stdin (optional)
            </span>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              rows={3}
              placeholder="Input passed to your program"
              className="font-mono text-sm bg-zinc-900 border-2 border-zinc-700 rounded-md px-2 py-1 text-zinc-100 outline-none focus:border-yellow-400"
            />
          </label>
          <div className="flex items-end justify-end gap-2">
            <Button
              variant="pixel"
              size="sm"
              onClick={runCode}
              disabled={running}
              className="font-game gap-2"
            >
              {running ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run
            </Button>
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
        <pre className="font-mono text-sm text-zinc-200 px-3 py-2 max-h-40 overflow-y-auto whitespace-pre-wrap">
          {output || (
            <span className="text-zinc-600">
              Click Run to compile and execute on Judge0. Compile errors and
              runtime output land here.
            </span>
          )}
        </pre>
      </div>
    </div>
  );
}

export default CppRunner;
