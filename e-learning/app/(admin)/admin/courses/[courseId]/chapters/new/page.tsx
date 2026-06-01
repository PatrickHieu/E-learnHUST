import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/config/db";
import { CoursesTable } from "@/config/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import ChapterForm from "../ChapterForm";

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
          <ChapterForm courseId={courseId} />
        </CardContent>
      </Card>
    </div>
  );
}
