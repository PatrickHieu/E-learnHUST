"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateLessonAction } from "../../../actions";

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

const SELECT_STYLE =
  "flex h-9 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400";

export default function EditLessonForm({ courseId, lesson }: Props) {
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setError(null);
    const result = await updateLessonAction(courseId, lesson.id, formData);
    if (result && !result.success) setError(result.error);
  }

  // Pull existing values per type so the form opens already filled in.
  const v = lesson.content ?? {};
  const starterCodeMap: Record<string, string> =
    (v.starterCode as Record<string, string>) ?? {};
  const starterEntries = Object.entries(starterCodeMap);
  const firstStarterName = starterEntries[0]?.[0] ?? "/index.html";
  const firstStarterCode = starterEntries[0]?.[1] ?? "";

  return (
    <form action={submit} className="flex flex-col gap-5">
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
      )}

      {lesson.type === "pdf" && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">PDF URL *</label>
          <Input name="pdfUrl" required defaultValue={v.pdfUrl ?? ""} />
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
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
