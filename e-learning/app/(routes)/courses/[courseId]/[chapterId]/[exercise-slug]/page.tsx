"use client";
import axios from 'axios';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import 'react-splitter-layout/lib/index.css';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import LessonRenderer, { Lesson } from './_components/LessonRenderer';

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

function Playground() {
  const { courseId, chapterId } = useParams();
  const slug = useParams()['exercise-slug'];
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LessonResponse>();
  const [accessError, setAccessError] = useState<string | null>(null);

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

  if (accessError) {
    return (
      <div className="border-t-4 h-screen w-full flex items-center justify-center p-10">
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
    );
  }

  return (
    <div className="border-t-4 h-screen w-full">
      <div className="h-full">
        <LessonRenderer
          lesson={data?.lesson}
          editorType={data?.editorType}
          isCompleted={isCompleted}
          loading={loading}
          refreshData={fetchLesson}
          completedCheckpointIndexes={data?.completedCheckpointIndexes ?? []}
        />
      </div>
      <div className='font-game fixed bottom-0 w-full bg-zinc-900 flex p-3 md:p-4 justify-between items-center gap-2'>
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
  );
}

export default Playground;
