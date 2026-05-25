import React from 'react'
import { Course } from '../../_components/CourseList'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import axios from 'axios'
import { useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'


type Props = {
  loading: boolean,
  courseDetail: Course | undefined,
  refreshData: () => void
}

function CourseDetailBanner({ loading, courseDetail, refreshData }: Props) {

  const [submitting, setSubmitting] = useState(false)
  const unlockCost = courseDetail?.unlockCost ?? 0;

  const EnrollCourse = async () => {
    setSubmitting(true);
    try {
      await axios.post('/api/enroll-course', { courseId: courseDetail?.courseId });
      toast.success(
        unlockCost > 0
          ? `Enrolled! Spent ${unlockCost} ⭐`
          : 'Course enrolled successfully!',
      );
      refreshData();
    } catch (error: any) {
      const reason = error?.response?.data?.reason;
      toast.error(reason ?? 'Failed to enroll in this course');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {!courseDetail ?
        <Skeleton className='w-full h-[300px]' />
        : <div className='relative'>
          <Image src={courseDetail?.bannerImage.trimEnd()} alt={courseDetail?.title}
            width={1400}
            height={300}
            className='w-full h-[350px] object-cover'
          />

          <div className='font-game absolute top-0 pt-20 p-10 md:px-24 lg:px-36 bg-linear-to-r from-black/80 to-white-50/50 h-full'>
            <h2 className='text-6xl'>{courseDetail?.title}</h2>
            <p className='text-3xl mt-3 text-gray-300'>{courseDetail?.desc}</p>
            {!courseDetail?.userEnrolled ? (
              <Button className='text-2xl mt-7' variant={'pixel'} size={'lg'}
                disabled={submitting}
                onClick={EnrollCourse}>
                {submitting && <Loader2Icon className='animate-spin' />}
                {unlockCost > 0 ? `Enroll (${unlockCost} ⭐)` : 'Enroll Now'}
              </Button>
            ) : (
              <Button className='text-2xl mt-7' size={'lg'} variant={'pixel'} disabled={submitting}>
                Continue Learning...
              </Button>
            )}
          </div>
        </div>
      }
    </div>
  )
}

export default CourseDetailBanner
