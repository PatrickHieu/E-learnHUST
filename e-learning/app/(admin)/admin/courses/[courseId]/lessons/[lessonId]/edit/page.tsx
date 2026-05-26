import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/config/db";
import { CoursesTable, LessonsTable } from "@/config/schema";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import EditLessonForm from "./EditLessonForm";

type Props = { params: Promise<{ courseId: string; lessonId: string }> };

export default async function EditLessonPage({ params }: Props) {
  const { courseId: rawCourseId, lessonId: rawLessonId } = await params;
  const courseId = parseInt(rawCourseId);
  const lessonId = parseInt(rawLessonId);
  if (Number.isNaN(courseId) || Number.isNaN(lessonId)) redirect("/admin/courses");

  const [course] = await db
    .select()
    .from(CoursesTable)
    .where(eq(CoursesTable.courseId, courseId))
    .limit(1);
  if (!course) redirect("/admin/courses");

  const [lesson] = await db
    .select()
    .from(LessonsTable)
    .where(
      and(eq(LessonsTable.id, lessonId), eq(LessonsTable.courseId, courseId)),
    )
    .limit(1);
  if (!lesson) redirect(`/admin/courses/${courseId}`);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 font-sans">
      <div className="flex items-center gap-3">
        <Link href={`/admin/courses/${courseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Lesson</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {course.title} → chapter #{lesson.chapterId}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <EditLessonForm
            courseId={courseId}
            lesson={{
              id: lesson.id,
              type: lesson.type,
              title: lesson.title,
              xp: lesson.xp,
              content: lesson.content,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
