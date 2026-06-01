"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { createLessonAction } from "../../actions";

type ChapterOption = { id: number; chapterId: number | null; name: string | null };

type Props = {
  courseId: number;
  chapters: ChapterOption[];
};

type LessonType = "video" | "pdf" | "exercise" | "quiz";

const SELECT_STYLE =
  "flex h-9 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400";

export default function LessonForm({ courseId, chapters }: Props) {
  const [type, setType] = useState<LessonType>("video");
  const [error, setError] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      // If the admin picked a PDF file, upload it to Cloudinary first and
      // overwrite the pdfUrl field with the resulting URL before calling
      // the server action.
      if (type === "pdf") {
        const file = pdfInputRef.current?.files?.[0];
        if (file && file.size > 0) {
          const url = await uploadToCloudinary(file);
          formData.set("pdfUrl", url);
        }
      }

      const result = await createLessonAction(courseId, formData);
      if (result && !result.success) setError(result.error);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Chapter *</label>
          <select name="chapterId" required className={SELECT_STYLE}>
            <option value="">— select chapter —</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.chapterId ?? ""}>
                #{c.chapterId} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Lesson Type *</label>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as LessonType)}
            className={SELECT_STYLE}
          >
            <option value="video">Video (YouTube / Vimeo / direct)</option>
            <option value="pdf">PDF / reading material</option>
            <option value="exercise">Exercise (Sandpack)</option>
            <option value="quiz">Quiz (multiple choice)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Title *</label>
          <Input name="title" required placeholder="e.g. Intro to Flexbox" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">XP Reward</label>
          <Input name="xp" type="number" min="0" defaultValue="10" />
        </div>
      </div>

      {type === "video" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Provider</label>
            <select name="provider" defaultValue="youtube" className={SELECT_STYLE}>
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="native">Direct URL (.mp4 etc.)</option>
            </select>
          </div>
          <div className="md:col-span-2 flex flex-col gap-2">
            <label className="text-sm font-medium">Video URL *</label>
            <Input name="url" required placeholder="https://www.youtube.com/watch?v=…" />
          </div>
        </div>
      )}

      {type === "pdf" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Upload PDF file</label>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFileName(e.target.files?.[0]?.name ?? null)}
              className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-zinc-300 dark:file:border-zinc-700 file:bg-transparent file:text-sm hover:file:bg-zinc-100 dark:hover:file:bg-zinc-900"
            />
            {pdfFileName && (
              <p className="text-xs text-zinc-500">Selected: {pdfFileName}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              {pdfFileName ? "PDF URL (will be filled after upload)" : "…or paste PDF URL *"}
            </label>
            <Input
              name="pdfUrl"
              required={!pdfFileName}
              placeholder="https://res.cloudinary.com/.../document.pdf"
            />
            <p className="text-xs text-zinc-500">
              Pick a file above to upload to Cloudinary on save, or paste a public URL directly.
            </p>
          </div>
        </div>
      )}

      {type === "exercise" && (
        <div className="flex flex-col gap-5 border-t border-zinc-200 dark:border-zinc-800 pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Difficulty</label>
              <select name="difficulty" defaultValue="easy" className={SELECT_STYLE}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Hint XP cost</label>
              <Input name="hintXp" type="number" min="0" defaultValue="0" />
              <p className="text-xs text-zinc-500">XP deducted if the learner peeks at the hint.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Content / Description (HTML) *</label>
            <Textarea
              name="content"
              required
              className="h-32 font-mono text-sm"
              placeholder="<p>Welcome to the exercise. Here's what you'll be doing…</p>"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Task instructions (HTML) *</label>
            <Textarea
              name="task"
              required
              className="h-24 font-mono text-sm"
              placeholder="<p>Add a &lt;title&gt; tag with the text Web Skeleton Adventure.</p>"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Hint (HTML)</label>
            <Textarea
              name="hint"
              className="h-24 font-mono text-sm"
              placeholder="<p>Open the &lt;head&gt; and add &lt;title&gt;…&lt;/title&gt;.</p>"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Starter file *</label>
              <Input name="starterFilename" required defaultValue="/index.html" placeholder="/index.html" />
              <p className="text-xs text-zinc-500">Leading slash. Becomes the tab name in Sandpack.</p>
            </div>
            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-medium">Starter code</label>
              <Textarea
                name="starterCode"
                className="h-40 font-mono text-sm"
                placeholder={"<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <title></title>\n  </head>\n  <body>\n  </body>\n</html>"}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Validation regex</label>
              <Input
                name="regex"
                placeholder="(?i)<title>\\s*Web Skeleton Adventure\\s*</title>"
                className="font-mono text-sm"
              />
              <p className="text-xs text-zinc-500">
                Optional. JS-flavoured; <code>(?i)</code>-style inline flags are stripped and applied to the constructor.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Expected output (substring)</label>
              <Textarea
                name="expectedOutput"
                className="h-24 font-mono text-sm"
                placeholder="<title>Web Skeleton Adventure</title>"
              />
              <p className="text-xs text-zinc-500">
                Optional. Submission must contain this exact text. Combine with regex or use either alone.
              </p>
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Leave both regex and expected output blank to make this lesson auto-pass when the learner clicks Mark Completed.
          </p>
        </div>
      )}

      {type === "quiz" && (
        <div className="flex flex-col gap-5 border-t border-zinc-200 dark:border-zinc-800 pt-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Question (HTML) *</label>
            <Textarea
              name="question"
              required
              className="h-24 font-mono text-sm"
              placeholder="<p>Which tag wraps the document head?</p>"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">Answer options *</label>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="correctIndex"
                    value={i - 1}
                    defaultChecked={i === 1}
                    className="w-4 h-4"
                  />
                  <span className="w-4 text-zinc-500">{String.fromCharCode(64 + i)}</span>
                </label>
                <Input name={`option${i}`} required placeholder={`Option ${String.fromCharCode(64 + i)}`} />
              </div>
            ))}
            <p className="text-xs text-zinc-500">
              All four options are required. Tick the radio next to the correct answer.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Explanation (HTML)</label>
            <Textarea
              name="explanation"
              className="h-20 font-mono text-sm"
              placeholder="<p>The &lt;head&gt; element holds metadata.</p>"
            />
            <p className="text-xs text-zinc-500">
              Optional. Shown to the student after they answer.
            </p>
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
          {submitting ? "Uploading & Saving…" : "Create Lesson"}
        </Button>
      </div>
    </form>
  );
}
