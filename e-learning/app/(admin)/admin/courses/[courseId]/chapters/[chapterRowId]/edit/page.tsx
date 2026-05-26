import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/config/db";
import { CourseChapterTable, CoursesTable } from "@/config/schema";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { updateChapterAction } from "../../../actions";

type Props = { params: Promise<{ courseId: string; chapterRowId: string }> };

export default async function EditChapterPage({ params }: Props) {
  const { courseId: rawCourseId, chapterRowId: rawChapterRowId } = await params;
  const courseId = parseInt(rawCourseId);
  const chapterRowId = parseInt(rawChapterRowId);
  if (Number.isNaN(courseId) || Number.isNaN(chapterRowId)) redirect("/admin/courses");

  const [course] = await db
    .select()
    .from(CoursesTable)
    .where(eq(CoursesTable.courseId, courseId))
    .limit(1);
  if (!course) redirect("/admin/courses");

  const [chapter] = await db
    .select()
    .from(CourseChapterTable)
    .where(
      and(
        eq(CourseChapterTable.id, chapterRowId),
        eq(CourseChapterTable.courseId, courseId),
      ),
    )
    .limit(1);
  if (!chapter) redirect(`/admin/courses/${courseId}`);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 font-sans">
      <div className="flex items-center gap-3">
        <Link href={`/admin/courses/${courseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit Chapter #{chapter.chapterId}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form
            action={updateChapterAction.bind(null, courseId, chapter.id)}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Chapter Name *</label>
              <Input name="name" required defaultValue={chapter.name ?? ""} />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Short Description</label>
              <Textarea name="desc" className="h-24" defaultValue={chapter.desc ?? ""} />
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 flex justify-end gap-3">
              <Link href={`/admin/courses/${courseId}`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
