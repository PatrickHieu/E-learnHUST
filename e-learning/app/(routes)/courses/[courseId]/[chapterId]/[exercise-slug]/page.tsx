"use client";
import axios from 'axios';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import 'react-splitter-layout/lib/index.css';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import LessonRenderer, { Lesson } from './_components/LessonRenderer';
import LessonSidebar from './_components/LessonSidebar';

type Sibling = {
  id: number,
  slug: string,
  title: string,
  type: string,
  orderIndex: number,
  xp: number,
};

type LessonResponse = {
  chapter: { id: number, courseId: number, chapterId: number } | null,
  lesson: Lesson,
  siblings: Sibling[],
  completedLessonIds: number[],
  completedCheckpointIndexes: number[],
  editorType: string | null,
};

type SidebarLesson = {
  id: number,
  slug: string,
  title: string,
  type: string,
  xp: number,
  gating?: boolean,
};

type SidebarChapter = {
  chapterId: number,
  name: string | null,
  lessons: SidebarLesson[],
};

type CourseDetailResponse = {
  courseId: number,
  title: string,
  chapters: SidebarChapter[],
  completedLessonIds: number[],
};

function Playground() {
  const { courseId, chapterId } = useParams();
  const slug = useParams()['exercise-slug'];
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LessonResponse>();
  const [courseDetail, setCourseDetail] = useState<CourseDetailResponse>();
  const [accessError, setAccessError] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const fetchLesson = async () => {
    setLoading(true);
    setAccessError(null);
    try {
      const result = await axios.post('/api/lesson', {
        courseId: parseInt(courseId as string),
        chapterId: parseInt(chapterId as string),
        slug: slug as string,
      });
      setData(result.data);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setAccessError(
          error?.response?.data?.reason ??
            "Complete the previous chapter to access this lesson.",
        );
      } else {
        console.error('Error fetching lesson:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Course detail (chapter + lesson list) is fetched separately from
  // /api/course so the sidebar can show the whole curriculum even
  // when /api/lesson rejects the current page with 403 (e.g., a
  // chapter-locked deep-link).
  const fetchCourseDetail = async () => {
    try {
      const result = await axios.get(`/api/course?courseId=${courseId}`);
      setCourseDetail(result.data);
    } catch (err) {
      console.error('Error fetching course detail:', err);
    }
  };

  useEffect(() => {
    fetchLesson();
  }, [courseId, chapterId, slug]);

  useEffect(() => {
    fetchCourseDetail();
  }, [courseId, data?.completedLessonIds?.length]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Prev/next navigation derived from sibling lessons ordered by orderIndex.
  const currentIndex = data?.siblings?.findIndex((s) => s.slug === slug) ?? -1;
  const nextSibling = data?.siblings?.[currentIndex + 1];
  const prevSibling = data?.siblings?.[currentIndex - 1];
  const nextRoute = nextSibling
    ? `/courses/${courseId}/${chapterId}/${nextSibling.slug}`
    : `/courses/${courseId}`;
  const prevRoute = prevSibling
    ? `/courses/${courseId}/${chapterId}/${prevSibling.slug}`
    : `/courses/${courseId}`;

  const isCompleted = !!(data?.lesson && data?.completedLessonIds?.includes(data.lesson.id));

  // Sidebar props derived from courseDetail. Completion list comes
  // from /api/lesson (most up-to-date after a Mark Completed), with
  // course detail as a fallback for first paint.
  const sidebarChapters: SidebarChapter[] = courseDetail?.chapters ?? [];
  const sidebarCompletedIds: number[] =
    data?.completedLessonIds ?? courseDetail?.completedLessonIds ?? [];
  const sidebarProps = {
    courseId: Number(courseId),
    courseTitle: courseDetail?.title ?? 'Course',
    chapters: sidebarChapters,
    completedLessonIds: sidebarCompletedIds,
    currentLessonId: data?.lesson?.id,
    currentChapterId: Number(chapterId),
  };

  if (accessError) {
    return (
      <div className="border-t-4 h-screen w-full flex">
        {/* Sidebar stays visible on the locked screen so the learner
            can jump back to an unlocked lesson without going through
            the course detail page. */}
        <div className="hidden md:block h-full">
          <LessonSidebar {...sidebarProps} />
        </div>
        <div className="flex-1 flex items-center justify-center p-10">
          <div className="max-w-md text-center font-game">
            <h2 className="text-4xl text-yellow-300 mb-4">Chapter locked</h2>
            <p className="text-xl text-zinc-300 mb-6">{accessError}</p>
            <Link href={`/courses/${courseId}`}>
              <Button variant="pixel" size="lg" className="font-game text-xl">
                Back to course
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t-4 h-screen w-full flex">
      {/* Desktop sidebar — always visible at md+ */}
      <div className="hidden md:block h-full">
        <LessonSidebar {...sidebarProps} />
      </div>

      {/* Main lesson area */}
      <div className="flex-1 h-full flex flex-col min-w-0 relative">
        {/* Mobile sidebar trigger */}
        <div className="md:hidden absolute top-2 left-2 z-30">
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="pixel" size="icon" aria-label="Open lesson list">
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 max-w-[85vw]">
              <LessonSidebar
                {...sidebarProps}
                onNavigate={() => setMobileSidebarOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex-1 min-h-0">
          <LessonRenderer
            lesson={data?.lesson}
            editorType={data?.editorType}
            isCompleted={isCompleted}
            loading={loading}
            refreshData={fetchLesson}
            completedCheckpointIndexes={data?.completedCheckpointIndexes ?? []}
          />
        </div>

        {/* Bottom bar with Prev / XP / Next.
            Positioned within the lesson area so it sits to the right of
            the sidebar on desktop instead of running underneath it. */}
        <div className='font-game shrink-0 bg-zinc-900 flex p-3 md:p-4 justify-between items-center gap-2 border-t-2 border-zinc-800'>
          <Link href={prevRoute}>
            <Button variant={'pixel'} size={'sm'} className="md:size-lg md:text-lg">Previous</Button>
          </Link>
          <div className='hidden md:flex gap-3 items-center'>
            <Image src='/star.png' alt='star' width={40} height={40} />
            <h2 className='text-2xl'>
              You can Earn <span className='text-4xl text-yellow-300'>{data?.lesson?.xp ?? 0}</span> Xp
            </h2>
          </div>
          <div className='flex md:hidden items-center gap-2 text-yellow-300 font-game'>
            <Image src='/star.png' alt='star' width={24} height={24} />
            <span className="text-base">{data?.lesson?.xp ?? 0} XP</span>
          </div>
          <Link href={nextRoute}>
            <Button variant={'pixel'} size={'sm'} className="md:size-lg md:text-lg">Next</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Playground;
