import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/config/db";
import { CoursesTable } from "@/config/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
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
    <div className="max-w-2xl mx-auto flex flex-col gap-6 font-sans">
      <div className="flex items-center gap-3">
        <Link href={`/admin/courses/${courseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          New Chapter — <span className="text-blue-500">{course.title}</span>
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={createChapterAction.bind(null, courseId)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Chapter Name *</label>
              <Input name="name" required placeholder="e.g. Forms & Inputs" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Short Description</label>
              <Textarea
                name="desc"
                placeholder="Optional summary shown to students on the course page"
                className="h-24"
              />
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 flex justify-end gap-3">
              <Link href={`/admin/courses/${courseId}`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit">Create Chapter</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
