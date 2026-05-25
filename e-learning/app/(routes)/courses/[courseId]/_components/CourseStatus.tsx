import React, { useEffect } from 'react'
import Image from 'next/image'
import { Progress } from '@/components/ui/progress'
import { Course } from '../../_components/CourseList'
import { useState } from 'react'


type Props = {
  courseDetail: Course | undefined
}

function CourseStatus({ courseDetail }: Props) {

  const [counts, setCounts] = useState<{
    totalLessons: number,
    totalXp: number,
  }>()

  useEffect(() => {
    courseDetail && GetCounts();
  }, [courseDetail])

  const GetCounts = () => {
    let totalLessons = 0;
    let totalXp = 0;
    courseDetail?.chapters?.forEach((chapter) => {
      totalLessons += chapter?.lessons?.length ?? 0;
      chapter?.lessons?.forEach(lesson => {
        totalXp += lesson?.xp ?? 0;
      });
    })

    setCounts({ totalLessons, totalXp })
  }

  const pct = (current: number, total: number) =>
    current && total ? (current * 100) / total : 0;

  const completedCount = courseDetail?.completedLessonIds?.length ?? 0;
  const totalLessons = counts?.totalLessons ?? 0;
  const xpEarned = courseDetail?.courseEnrolledInfo?.xpEarned ?? 0;
  const totalXp = counts?.totalXp ?? 0;

  return (
    <div className='font-game p-4 border-4 rounded-xl w-full'>
      <h2 className='text-3xl '>Course Progress</h2>
      <div className='flex items-center gap-5 mt-4'>
        <Image src={'/book.png'} alt='book' width={50} height={50} />
        <div className='w-full'>
          <h2 className='flex justify-between text-2xl'>
            Lessons <span className='text-gray-400'>{completedCount}/{totalLessons}</span>
          </h2>
          <Progress value={pct(completedCount, totalLessons)} className='mt-2' />
        </div>
      </div>

      <div className='flex items-center gap-5 mt-4'>
        <Image src={'/star.png'} alt='star' width={50} height={50} />
        <div className='w-full'>
          <h2 className='flex justify-between text-2xl'>
            XP Earned<span className='text-gray-400'>{xpEarned}/{totalXp}</span>
          </h2>
          <Progress value={pct(xpEarned, totalXp)} className='mt-2' />
        </div>
      </div>
    </div>
  )
}

export default CourseStatus
