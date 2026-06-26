"use client";
import axios from 'axios';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';
import 'react-splitter-layout/lib/index.css';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import LessonRenderer, { Lesson } from './_components/LessonRenderer';
import LessonSidebar from './_components/LessonSidebar';
import { CourseDataContext } from '../../CourseDataContext';

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
  // Source code the student submitted when they passed this lesson.
  // Null if they haven't completed it yet, or for non-exercise lessons.
  // The runner replays it instead of the starter snippet on revisit.
  savedSubmission: string | null,
  editorType: string | null,
};

function Playground() {
  const { courseId, chapterId } = useParams();
  const slug = useParams()['exercise-slug'];
  // Course detail comes from [courseId]/layout.tsx context — single
  // fetch shared with the course landing page, no re-fetch on lesson
  // switch. Only /api/lesson runs per navigation, which is small and
  // returns in <100ms.
  const { courseDetail, refreshCourseDetail } = useContext(CourseDataContext);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LessonResponse>();
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

  // After a Mark Completed click, both the local lesson payload AND
  // the shared course detail need to refresh: the lesson one for the
  // sidebar's "current" completion state, the course one for the
  // green check-mark on every chapter / lesson row of the sidebar.
  const refreshAll = async () => {
    await Promise.all([fetchLesson(), refreshCourseDetail()]);
  };

  useEffect(() => {
    fetchLesson();
  }, [courseId, chapterId, slug]);

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

  // Sidebar props derived from the layout-cached courseDetail.
  // Completion list comes from /api/lesson when it has resolved
  // (freshest after Mark Completed), with the course payload as the
  // fallback for first paint.
  const sidebarChapters = courseDetail?.chapters ?? [];
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
      // The global header in app/provider.tsx eats ~5rem at the top of
      // the viewport; using bare h-screen here pushed the lesson's
      // bottom bar + the runner's Run / Mark Completed buttons below
      // the visible page, so the student had to scroll to even see the
      // controls. Subtract the header height so the playground always
      // fits between the header and the viewport bottom.
      <div className="border-t-4 h-[calc(100dvh-5rem)] w-full flex">
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
    <div className="border-t-4 h-[calc(100dvh-5rem)] w-full flex">
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
            refreshData={refreshAll}
            completedCheckpointIndexes={data?.completedCheckpointIndexes ?? []}
            savedSubmission={data?.savedSubmission ?? null}
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
