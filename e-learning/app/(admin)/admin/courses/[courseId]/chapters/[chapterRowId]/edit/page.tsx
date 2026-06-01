import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/config/db";
import { CourseChapterTable, CoursesTable } from "@/config/schema";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import ChapterForm from "../../ChapterForm";

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
          <ChapterForm
            courseId={courseId}
            chapter={{
              id: chapter.id,
              name: chapter.name ?? "",
              desc: chapter.desc ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
