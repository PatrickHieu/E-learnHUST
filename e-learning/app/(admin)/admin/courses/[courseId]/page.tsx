import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/config/db";
import {
  CourseChapterTable,
  CoursesTable,
  LessonsTable,
} from "@/config/schema";
import { asc, eq } from "drizzle-orm";
import {
  Plus,
  Trash2,
  Video,
  FileText,
  Code2,
  ArrowLeft,
  Pencil,
  HelpCircle,
} from "lucide-react";
import { deleteChapterAction, deleteLessonAction } from "./actions";

type Props = { params: Promise<{ courseId: string }> };

function lessonIcon(type: string) {
  if (type === "video") return <Video className="w-4 h-4 text-pink-500" />;
  if (type === "pdf") return <FileText className="w-4 h-4 text-blue-500" />;
  if (type === "quiz") return <HelpCircle className="w-4 h-4 text-purple-500" />;
  return <Code2 className="w-4 h-4 text-green-500" />;
}

export default async function CourseDetailAdminPage({ params }: Props) {
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
    .select()
    .from(CourseChapterTable)
    .where(eq(CourseChapterTable.courseId, courseId))
    .orderBy(asc(CourseChapterTable.chapterId));

  const lessons = await db
    .select()
    .from(LessonsTable)
    .where(eq(LessonsTable.courseId, courseId))
    .orderBy(asc(LessonsTable.chapterId), asc(LessonsTable.orderIndex));

  const lessonsByChapter = new Map<number, typeof lessons>();
  for (const l of lessons) {
    const list = lessonsByChapter.get(l.chapterId) ?? [];
    list.push(l);
    lessonsByChapter.set(l.chapterId, list);
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 font-sans">
      <div className="flex items-center gap-3">
        <Link href="/admin/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-blue-500">{course.title}</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Manage chapters and lessons.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/courses/${courseId}/chapters/new`}>
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> Chapter
            </Button>
          </Link>
          <Link href={`/admin/courses/${courseId}/lessons/new`}>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Lesson
            </Button>
          </Link>
        </div>
      </div>

      {chapters.length === 0 ? (
        <Card className="p-10 text-center text-zinc-500 border-dashed">
          No chapters yet. Start by adding one.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {chapters.map((chapter) => {
            const chapterLessons = lessonsByChapter.get(chapter.chapterId ?? -1) ?? [];
            return (
              <Card key={chapter.id} className="overflow-hidden p-0">
                <header className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  <div>
                    <h2 className="text-base font-medium">
                      <span className="text-zinc-400 mr-2">#{chapter.chapterId}</span>
                      {chapter.name}
                    </h2>
                    {chapter.desc && (
                      <p className="text-xs text-zinc-500 mt-1">{chapter.desc}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/admin/courses/${courseId}/chapters/${chapter.id}/edit`}>
                      <Button variant="ghost" size="icon" title="Edit chapter">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </Link>
                    <form action={deleteChapterAction.bind(null, courseId, chapter.id)}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        disabled={chapterLessons.length > 0}
                        title={chapterLessons.length > 0 ? "Delete lessons first" : "Delete chapter"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </header>

                <div className="p-3">
                  {chapterLessons.length === 0 ? (
                    <p className="text-zinc-500 text-sm px-2 py-3">No lessons in this chapter yet.</p>
                  ) : (
                    <ul className="flex flex-col">
                      {chapterLessons.map((l) => (
                        <li
                          key={l.id}
                          className="flex items-center justify-between px-3 py-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                        >
                          <div className="flex items-center gap-3">
                            {lessonIcon(l.type)}
                            <span className="text-xs uppercase tracking-wide text-zinc-500 w-16">
                              {l.type}
                            </span>
                            <span className="text-sm">{l.title}</span>
                            <span className="text-yellow-600 dark:text-yellow-400 text-xs ml-2">
                              {l.xp} XP
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Link href={`/admin/courses/${courseId}/lessons/${l.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit lesson">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                            <form action={deleteLessonAction.bind(null, courseId, l.id)}>
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 h-7 w-7"
                                title="Delete lesson"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </form>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
