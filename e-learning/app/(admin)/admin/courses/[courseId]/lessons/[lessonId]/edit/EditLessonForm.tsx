"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { updateLessonAction } from "../../../actions";
import CheckpointsEditor from "../../CheckpointsEditor";
import TestcasesEditor from "../../TestcasesEditor";
import type { ExerciseTestCase, VideoQuizCheckpoint } from "@/config/schema";

type Props = {
  courseId: number;
  lesson: {
    id: number;
    type: string;
    title: string;
    xp: number;
    content: any;
  };
};

// See note in LessonForm.tsx — same readability fix.
const SELECT_STYLE =
  "flex h-9 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 [&_option]:bg-white [&_option]:text-zinc-900 dark:[&_option]:bg-zinc-900 dark:[&_option]:text-zinc-100";

export default function EditLessonForm({ courseId, lesson }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const initialCheckpoints: VideoQuizCheckpoint[] =
    lesson.type === "video" && Array.isArray(lesson.content?.inVideoQuizzes)
      ? (lesson.content.inVideoQuizzes as VideoQuizCheckpoint[])
      : [];
  const [checkpoints, setCheckpoints] =
    useState<VideoQuizCheckpoint[]>(initialCheckpoints);

  const initialTestcases: ExerciseTestCase[] =
    lesson.type === "exercise" && Array.isArray(lesson.content?.testcases)
      ? (lesson.content.testcases as ExerciseTestCase[])
      : [];
  const [testcases, setTestcases] =
    useState<ExerciseTestCase[]>(initialTestcases);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      if (lesson.type === "pdf") {
        const file = pdfInputRef.current?.files?.[0];
        if (file && file.size > 0) {
          const url = await uploadToCloudinary(file);
          formData.set("pdfUrl", url);
        }
      }

      const result = await updateLessonAction(courseId, lesson.id, formData);
      if (result && !result.success) setError(result.error);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  // Pull existing values per type so the form opens already filled in.
  const v = lesson.content ?? {};
  const starterCodeMap: Record<string, string> =
    (v.starterCode as Record<string, string>) ?? {};
  const starterEntries = Object.entries(starterCodeMap);
  const firstStarterName = starterEntries[0]?.[0] ?? "/index.html";
  const firstStarterCode = starterEntries[0]?.[1] ?? "";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Type</label>
          <span className="inline-flex items-center px-3 py-1 rounded text-xs uppercase border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 w-fit">
            {lesson.type}
          </span>
          <p className="text-xs text-zinc-500">
            Type is locked. Delete and recreate the lesson to change it.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Title *</label>
          <Input name="title" required defaultValue={lesson.title} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">XP Reward</label>
          <Input name="xp" type="number" min="0" defaultValue={lesson.xp} />
        </div>
      </div>

      {lesson.type === "video" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Provider</label>
              <select
                name="provider"
                defaultValue={v.provider ?? "youtube"}
                className={SELECT_STYLE}
              >
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
                <option value="native">Direct URL (.mp4 etc.)</option>
              </select>
            </div>
            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-medium">Video URL *</label>
              <Input name="url" required defaultValue={v.url ?? ""} />
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5">
            <CheckpointsEditor checkpoints={checkpoints} onChange={setCheckpoints} />
            <input type="hidden" name="inVideoQuizzes" value={JSON.stringify(checkpoints)} />
          </div>
        </div>
      )}

      {lesson.type === "pdf" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              PDF link (Google Drive recommended) *
            </label>
            <Input
              name="pdfUrl"
              required
              defaultValue={v.pdfUrl ?? ""}
              placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
            />
            <p className="text-xs text-zinc-500">
              Paste a Google Drive share link, or any public PDF URL. For Drive, set sharing to
              {" "}
              <span className="font-medium">&quot;Anyone with the link can view&quot;</span>
              {" "}
              so students can read it.
            </p>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300 select-none">
              Advanced: upload a new PDF file to Cloudinary instead
            </summary>
            <div className="flex flex-col gap-2 mt-3 pl-3 border-l-2 border-zinc-200 dark:border-zinc-800">
              <label className="text-sm font-medium">Upload new PDF</label>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFileName(e.target.files?.[0]?.name ?? null)}
                className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-zinc-300 dark:file:border-zinc-700 file:bg-transparent file:text-sm hover:file:bg-zinc-100 dark:hover:file:bg-zinc-900"
              />
              {pdfFileName ? (
                <p className="text-xs text-zinc-500">Selected: {pdfFileName} — uploaded to Cloudinary on save, overrides the link above.</p>
              ) : (
                <p className="text-xs text-zinc-500">
                  Leave blank to keep the link above. Cloudinary&apos;s free tier requires the PDF/ZIP delivery toggle to be on — Drive is more reliable.
                </p>
              )}
            </div>
          </details>
        </div>
      )}

      {lesson.type === "exercise" && (
        <div className="flex flex-col gap-5 border-t border-zinc-200 dark:border-zinc-800 pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Difficulty</label>
              <select
                name="difficulty"
                defaultValue={v.difficulty ?? "easy"}
                className={SELECT_STYLE}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Hint XP cost</label>
              <Input name="hintXp" type="number" min="0" defaultValue={v.hintXp ?? 0} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Content / Description (HTML) *</label>
            <Textarea
              name="content"
              required
              className="h-32 font-mono text-sm"
              defaultValue={v.content ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Task instructions (HTML) *</label>
            <Textarea
              name="task"
              required
              className="h-24 font-mono text-sm"
              defaultValue={v.task ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Hint (HTML)</label>
            <Textarea
              name="hint"
              className="h-24 font-mono text-sm"
              defaultValue={v.hint ?? ""}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Starter file *</label>
              <Input name="starterFilename" required defaultValue={firstStarterName} />
              {starterEntries.length > 1 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  This lesson has {starterEntries.length} starter files. Editing here
                  collapses them to one — only the first is shown. Use SQL for
                  multi-file starters.
                </p>
              )}
            </div>
            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-medium">Starter code</label>
              <Textarea
                name="starterCode"
                className="h-40 font-mono text-sm"
                defaultValue={firstStarterCode}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Validation regex</label>
              <Input
                name="regex"
                defaultValue={v.regex ?? ""}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Expected output (substring)</label>
              <Textarea
                name="expectedOutput"
                className="h-24 font-mono text-sm"
                defaultValue={v.expectedOutput ?? ""}
              />
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5">
            <TestcasesEditor testcases={testcases} onChange={setTestcases} />
            <input type="hidden" name="testcases" value={JSON.stringify(testcases)} />
          </div>
        </div>
      )}

      {lesson.type === "quiz" && (
        <div className="flex flex-col gap-5 border-t border-zinc-200 dark:border-zinc-800 pt-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Question (HTML) *</label>
            <Textarea
              name="question"
              required
              className="h-24 font-mono text-sm"
              defaultValue={v.question ?? ""}
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">Answer options *</label>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="correctIndex"
                    value={i}
                    defaultChecked={i === (v.correctIndex ?? 0)}
                    className="w-4 h-4"
                  />
                  <span className="w-4 text-zinc-500">{String.fromCharCode(65 + i)}</span>
                </label>
                <Input
                  name={`option${i + 1}`}
                  required
                  defaultValue={(v.options as string[] | undefined)?.[i] ?? ""}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Explanation (HTML)</label>
            <Textarea
              name="explanation"
              className="h-20 font-mono text-sm"
              defaultValue={v.explanation ?? ""}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 flex justify-end gap-3">
        <Link href={`/admin/courses/${courseId}`}>
          <Button type="button" variant="outline">Cancel</Button>
        </Link>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Uploading & Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
