import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { db } from "@/config/db";
import { CourseChapterTable, CoursesTable } from "@/config/schema";
import { asc, eq } from "drizzle-orm";
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
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/courses/${courseId}`}>
          <Button variant="outline" className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            ←
          </Button>
        </Link>
        <h1 className="text-3xl font-bold font-game text-white">
          New Lesson — <span className="text-blue-400">{course.title}</span>
        </h1>
      </div>

      {chapters.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 font-game text-zinc-400">
          You need to create a chapter before adding lessons.{" "}
          <Link href={`/admin/courses/${courseId}/chapters/new`} className="text-blue-400 underline">
            Create one now →
          </Link>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <LessonForm courseId={courseId} chapters={chapters} />
        </div>
      )}
    </div>
  );
}
