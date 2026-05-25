import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { db } from "@/config/db";
import {
  CourseChapterTable,
  CoursesTable,
  LessonsTable,
} from "@/config/schema";
import { asc, eq } from "drizzle-orm";
import { Plus, Trash2, Video, FileText, Code2 } from "lucide-react";
import { deleteChapterAction, deleteLessonAction } from "./actions";

type Props = { params: Promise<{ courseId: string }> };

function lessonIcon(type: string) {
  if (type === "video") return <Video className="w-4 h-4 text-pink-300" />;
  if (type === "pdf") return <FileText className="w-4 h-4 text-blue-300" />;
  return <Code2 className="w-4 h-4 text-green-300" />;
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
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/courses">
          <Button variant="outline" className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            ←
          </Button>
        </Link>
        <h1 className="text-3xl font-bold font-game text-white">
          <span className="text-blue-400">{course.title}</span>
        </h1>
      </div>

      <div className="flex justify-end gap-3">
        <Link href={`/admin/courses/${courseId}/chapters/new`}>
          <Button variant="outline" className="bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800 flex gap-2">
            <Plus className="w-4 h-4" /> New Chapter
          </Button>
        </Link>
        <Link href={`/admin/courses/${courseId}/lessons/new`}>
          <Button variant="default" className="flex gap-2">
            <Plus className="w-4 h-4" /> New Lesson
          </Button>
        </Link>
      </div>

      {chapters.length === 0 ? (
        <div className="font-game text-center text-zinc-500 p-10 border-2 border-dashed border-zinc-800 rounded-2xl">
          No chapters yet. Start by adding one.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {chapters.map((chapter) => {
            const chapterLessons = lessonsByChapter.get(chapter.chapterId ?? -1) ?? [];
            return (
              <section key={chapter.id} className="border border-zinc-800 rounded-xl bg-zinc-900 overflow-hidden">
                <header className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
                  <div>
                    <h2 className="text-xl font-game text-white">
                      <span className="text-zinc-500 mr-3">#{chapter.chapterId}</span>
                      {chapter.name}
                    </h2>
                    {chapter.desc && <p className="text-sm text-zinc-500 mt-1">{chapter.desc}</p>}
                  </div>
                  <form action={deleteChapterAction.bind(null, courseId, chapter.id)}>
                    <Button
                      type="submit"
                      variant="outline"
                      size="icon"
                      className="bg-transparent border-zinc-700 hover:bg-red-900/50"
                      disabled={chapterLessons.length > 0}
                      title={chapterLessons.length > 0 ? "Delete lessons first" : "Delete chapter"}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </form>
                </header>

                <div className="p-4">
                  {chapterLessons.length === 0 ? (
                    <p className="text-zinc-500 text-sm font-game">No lessons in this chapter yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {chapterLessons.map((l) => (
                        <li key={l.id} className="flex items-center justify-between px-3 py-2 rounded hover:bg-zinc-800/50">
                          <div className="flex items-center gap-3">
                            {lessonIcon(l.type)}
                            <span className="text-xs uppercase tracking-wide text-zinc-500">{l.type}</span>
                            <span className="text-white">{l.title}</span>
                            <span className="text-yellow-400 text-sm font-game ml-2">{l.xp}xp</span>
                          </div>
                          <form action={deleteLessonAction.bind(null, courseId, l.id)}>
                            <Button
                              type="submit"
                              variant="outline"
                              size="icon"
                              className="bg-transparent border-zinc-800 hover:bg-red-900/40"
                              title="Delete lesson"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </Button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
