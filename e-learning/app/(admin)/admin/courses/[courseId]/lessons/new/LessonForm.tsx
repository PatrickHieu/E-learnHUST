"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createLessonAction } from "../../actions";

type ChapterOption = { id: number; chapterId: number | null; name: string | null };

type Props = {
  courseId: number;
  chapters: ChapterOption[];
};

export default function LessonForm({ courseId, chapters }: Props) {
  const [type, setType] = useState<"video" | "pdf">("video");
  const [error, setError] = useState<string | null>(null);

  // Wraps the bound server action so we can surface validation errors (the
  // action returns { success, error } on bad input rather than throwing).
  async function submit(formData: FormData) {
    setError(null);
    const result = await createLessonAction(courseId, formData);
    if (result && !result.success) setError(result.error);
  }

  return (
    <form action={submit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-zinc-400 font-game text-sm">Chapter *</label>
          <select
            name="chapterId"
            required
            className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
          >
            <option value="">— select chapter —</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.chapterId ?? ""}>
                #{c.chapterId} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-zinc-400 font-game text-sm">Lesson Type *</label>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as "video" | "pdf")}
            className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
          >
            <option value="video">Video (YouTube / Vimeo / direct)</option>
            <option value="pdf">PDF / reading material</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-zinc-400 font-game text-sm">Title *</label>
          <Input name="title" required placeholder="e.g. Intro to Flexbox" className="bg-zinc-950 border-zinc-800 text-white" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-zinc-400 font-game text-sm">XP Reward</label>
          <Input name="xp" type="number" min="0" defaultValue="10" className="bg-zinc-950 border-zinc-800 text-yellow-400 font-bold" />
        </div>
      </div>

      {type === "video" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-zinc-400 font-game text-sm">Provider</label>
            <select
              name="provider"
              defaultValue="youtube"
              className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
            >
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="native">Direct URL (.mp4 etc.)</option>
            </select>
          </div>
          <div className="md:col-span-2 flex flex-col gap-2">
            <label className="text-zinc-400 font-game text-sm">Video URL *</label>
            <Input
              name="url"
              required
              placeholder="https://www.youtube.com/watch?v=…"
              className="bg-zinc-950 border-zinc-800 text-white"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-zinc-400 font-game text-sm">PDF URL *</label>
          <Input
            name="pdfUrl"
            required
            placeholder="https://res.cloudinary.com/.../document.pdf"
            className="bg-zinc-950 border-zinc-800 text-white"
          />
          <p className="text-xs text-zinc-500">
            Upload to Cloudinary first (or any public PDF host) and paste the URL here.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="border-t border-zinc-800 pt-5 flex justify-end gap-3">
        <Link href={`/admin/courses/${courseId}`}>
          <Button type="button" variant="outline" className="bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800">
            Cancel
          </Button>
        </Link>
        <Button type="submit" variant="pixel">Create Lesson</Button>
      </div>
    </form>
  );
}
