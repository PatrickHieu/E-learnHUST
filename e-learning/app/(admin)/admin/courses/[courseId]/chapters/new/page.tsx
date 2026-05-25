import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/config/db";
import { CoursesTable } from "@/config/schema";
import { eq } from "drizzle-orm";
import { createChapterAction } from "../../actions";

type Props = { params: Promise<{ courseId: string }> };

export default async function NewChapterPage({ params }: Props) {
  const { courseId: rawCourseId } = await params;
  const courseId = parseInt(rawCourseId);
  if (Number.isNaN(courseId)) redirect("/admin/courses");

  const [course] = await db
    .select()
    .from(CoursesTable)
    .where(eq(CoursesTable.courseId, courseId))
    .limit(1);
  if (!course) redirect("/admin/courses");

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/courses/${courseId}`}>
          <Button variant="outline" className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            ←
          </Button>
        </Link>
        <h1 className="text-3xl font-bold font-game text-white">
          New Chapter — <span className="text-blue-400">{course.title}</span>
        </h1>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <form action={createChapterAction.bind(null, courseId)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-zinc-400 font-game text-sm">Chapter Name *</label>
            <Input
              name="name"
              required
              placeholder="e.g. Forms & Inputs"
              className="bg-zinc-950 border-zinc-800 text-white"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-zinc-400 font-game text-sm">Short Description</label>
            <Textarea
              name="desc"
              placeholder="Optional summary shown to students on the course page"
              className="bg-zinc-950 border-zinc-800 text-white h-24"
            />
          </div>

          <div className="border-t border-zinc-800 pt-5 flex justify-end gap-3">
            <Link href={`/admin/courses/${courseId}`}>
              <Button type="button" variant="outline" className="bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800">
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="pixel">
              Create Chapter
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
