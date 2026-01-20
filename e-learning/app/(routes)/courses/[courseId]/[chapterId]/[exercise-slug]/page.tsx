"use client";
import axios from 'axios';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import 'react-splitter-layout/lib/index.css';
import { CompletedExercises, exercise } from '../../../_components/CourseList';
import ContentSection from '../[exercise-slug]/_components/ContentSection';
import dynamic from 'next/dynamic';
import CodeEditor from './_components/CodeEditor';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ExercisesTable } from '@/config/schema';
import Link from 'next/link';

const SplitterLayout = dynamic(() => import('react-splitter-layout'), {
  ssr: false,
});



export type CourseExercise = {
  chapterId: number,
  courseId: number,
  desc: string,
  name: string,
  editorType?: string,
  exercises: exercise[],
  exerciseData: ExerciseData,
  completedExercise?: CompletedExercises[],
}

type ExerciseData = {
  chapterId: number,
  courseId: number,
  exerciseId: number,
  exerciseName: string,
  exerciseContent: ExerciseContent,
}

type ExerciseContent = {
  content: string,
  hint: string,
  hintXp: string,
  starterCode: string,
  task: string,
}
function Playground() {

  const { courseId, chapterId } = useParams();
  const exerciseSlug = useParams()['exercise-slug'];
  const [loading, setLoading] = useState(false);

  const [courseExerciseData, setCourseExerciseData] = useState<CourseExercise>();
  const [nextButtonRoute, setNextButtonRoute] = useState<string>();
  const [preButtonRoute, setPreButtonRoute] = useState<string>();

  console.log(courseId, chapterId, exerciseSlug);

  useEffect(() => {
    GetExerciseCourseDetail();
  }, []);


  const GetExerciseCourseDetail = async () => {
    setLoading(true)
    try {
      const result = await axios.post('/api/exercise', {
        courseId: parseInt(courseId as string),
        chapterId: parseInt(chapterId as string),
        exerciseId: exerciseSlug,
      })

      console.log('API Response:', result.data);
      console.log('exerciseData:', result.data?.exerciseData);
      console.log('exerciseContent:', result.data?.exerciseData?.exerciseContent);

      setCourseExerciseData(result.data);
    } catch (error) {
      console.error('Error fetching exercise data:', error);
    } finally {
      setLoading(false)
    }
  }

  const { 'exercise-slug': exerciseslug } = useParams();


  const GetPreNextButtonRoute = () => {
    const currentExerciseIndex = courseExerciseData?.exercises?.findIndex(
      (item) => item.slug === exerciseslug
    ) ?? -1;
    const NextExercise = courseExerciseData?.exercises?.[currentExerciseIndex + 1];
    const PreExercise = courseExerciseData?.exercises?.[currentExerciseIndex - 1];

    console.log(NextExercise, PreExercise)
    setNextButtonRoute((NextExercise ? '/courses/' + courseId + '/' + chapterId + '/' + NextExercise.slug : undefined));
    setPreButtonRoute((PreExercise ? '/courses/' + courseId + '/' + chapterId + '/' + PreExercise.slug : undefined));
  }

  useEffect(() => {
    if (courseExerciseData) {
      GetPreNextButtonRoute();
    }
  }, [courseExerciseData, exerciseslug]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    }

  }, []);

  const currentExercise = courseExerciseData?.exercises?.find(
    (item) => item.slug == exerciseSlug
  );

  return (
    <div className="border-t-4 h-screen w-full">
      <SplitterLayout percentage primaryMinSize={40} secondaryMinSize={60} >
        <div className="h-full overflow-auto">
          <ContentSection courseExerciseData={courseExerciseData} loading={loading} />
        </div>
        <div className="h-full">
          <CodeEditor courseExerciseData={courseExerciseData} loading={loading} refreshData={GetExerciseCourseDetail} />
        </div>
      </SplitterLayout>
      <div className='font-game fixed bottom-0 w-full bg-zinc-900 flex p-4 justify-between items-center'>
        <Link href={preButtonRoute ?? '/courses' + '/' + courseId}>
          <Button variant={'pixel'} size={'lg'} >Previous</Button>
        </Link>
        <div className='flex gap-3 items-center'>
          <Image src='/star.png' alt='star' width={40} height={40} />
          <h2 className='text-2xl'>You can Earn <span className='text-4xl text-yellow-300'>{currentExercise?.xp}</span> Xp</h2>
        </div>
        <Link href={nextButtonRoute ?? '/courses' + '/' + courseId}>
          <Button variant={'pixel'} size={'lg'} >Next</Button>
        </Link>
      </div>
    </div>
  )
}

export default Playground
