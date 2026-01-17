"use client";
import axios from 'axios';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import 'react-splitter-layout/lib/index.css';
import { exercise } from '../../../_components/CourseList';
import ContentSection from '../[exercise-slug]/_components/ContentSection';
import dynamic from 'next/dynamic';

const SplitterLayout = dynamic(() => import('react-splitter-layout'), {
  ssr: false,
});



export type CourseExercise = {
  chapterId: number,
  courseId: number,
  desc: string,
  name: string,
  exercises: exercise[],
  exerciseData: ExerciseData
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

  return (
    <div className="border-t-4 h-screen w-full">
      <SplitterLayout percentage primaryMinSize={40} secondaryMinSize={60} >
        <div>
          <ContentSection courseExerciseData={courseExerciseData} loading={loading} />
        </div>
        <div>Code editor</div>
      </SplitterLayout>
    </div>
  )
}

export default Playground
