"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createChapterAction, updateChapterAction } from "../actions";

type Props = {
  courseId: number;
  // Edit mode when chapter is provided; create mode otherwise.
  chapter?: {
    id: number;
    name: string;
    desc: string;
  };
};

export default function ChapterForm({ courseId, chapter }: Props) {
  const isEdit = Boolean(chapter);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = isEdit
        ? await updateChapterAction(courseId, chapter!.id, formData)
        : await createChapterAction(courseId, formData);
      if (result && !result.success) {
        setError(result.error);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Chapter Name *</label>
        <Input
          name="name"
          required
          defaultValue={chapter?.name ?? ""}
          placeholder="e.g. Forms & Inputs"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Short Description</label>
        <Textarea
          name="desc"
          defaultValue={chapter?.desc ?? ""}
          className="h-24"
          placeholder="Optional summary shown to students on the course page"
        />
      </div>

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
          {submitting ? "Saving..." : isEdit ? "Save" : "Create Chapter"}
        </Button>
      </div>
    </form>
  );
}
