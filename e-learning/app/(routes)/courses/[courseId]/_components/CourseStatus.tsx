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
    totalExce: number,
    totalXp: number,
  }>()

  useEffect(() => {
    courseDetail && GetCounts();
  }, [courseDetail])

  const GetCounts = () => {
    let totalExcercises = 0;
    let totalXp = 0;
    courseDetail?.chapters?.forEach((chapter) => {
      totalExcercises = totalExcercises + (chapter?.excercises?.length || 0);
      chapter?.excercises?.forEach(exc => {
        totalXp = totalXp + exc?.xp;
      });
    })

    setCounts({
      totalExce: totalExcercises,
      totalXp: totalXp
    })
  }

  return (
    <div className='font-game p-4 border-4 rounded-xl w-full'>
      <h2 className='text-3xl '>Course Progress</h2>
      <div className='flex items-center gap-5 mt-4'>
        <Image src={'/book.png'} alt='book'
          width={50}
          height={50}
        />
        <div className='w-full'>
          <h2 className='flex justify-between text-2xl'>Excercises <span className='text-gray-400'>1/{counts?.totalExce}</span> </h2>
          <Progress value={37} className='mt-2' />
        </div>
      </div>

      <div className='flex items-center gap-5 mt-4'>
        <Image src={'/star.png'} alt='book'
          width={50}
          height={50}
        />
        <div className='w-full'>
          <h2 className='flex justify-between text-2xl'>XP Earned<span className='text-gray-400'>1/{counts?.totalXp}</span> </h2>
          <Progress value={37} className='mt-2' />
        </div>
      </div>
    </div>
  )
}

export default CourseStatus
