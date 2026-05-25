import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/config/db";
import { CourseChapterTable, CoursesTable } from "@/config/schema";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import LessonForm from "./LessonForm";

type Props = { params: Promise<{ courseId: string }> };

export default async function NewLessonPage({ params }: Props) {
  const { courseId: rawCourseId } = await params;
  const courseId = parseInt(rawCourseId);
  if (Number.isNaN(courseId)) redirect("/admin/courses");

  const [course] = await db
    .select()
    .from(CoursesTable)
    .where(eq(CoursesTable.courseId, courseId))
    .limit(1);
  if (!course) redirect("/admin/courses");

  const chapters = await db
    .select({
      id: CourseChapterTable.id,
      chapterId: CourseChapterTable.chapterId,
      name: CourseChapterTable.name,
    })
    .from(CourseChapterTable)
    .where(eq(CourseChapterTable.courseId, courseId))
    .orderBy(asc(CourseChapterTable.chapterId));

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 font-sans">
      <div className="flex items-center gap-3">
        <Link href={`/admin/courses/${courseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          New Lesson — <span className="text-blue-500">{course.title}</span>
        </h1>
      </div>

      {chapters.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-zinc-500">
            You need to create a chapter before adding lessons.{" "}
            <Link href={`/admin/courses/${courseId}/chapters/new`} className="text-blue-500 underline">
              Create one now →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <LessonForm courseId={courseId} chapters={chapters} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
