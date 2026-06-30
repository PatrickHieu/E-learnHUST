import React from 'react'
import { EnrolledCourseInfo } from './EnrolledCourses'
import Image from 'next/image'
import { Progress } from '@/components/ui/progress'
import  Link  from 'next/link'

type Props = {
    course: EnrolledCourseInfo,
}

function CourseProgressCard({ course }: Props) {
    // h-full block on the Link so the grid's items-stretch can size each
    // card to its row peer; flex-col + flex-1 in the body so the progress
    // bar always hugs the bottom no matter how long the title wraps.
    return (
        <Link href={'/courses/' + course?.courseId} className='h-full block'>
            <div className='h-full flex flex-col border-4 rounded-2xl overflow-hidden'>
                <Image src={course.bannerImage.trimEnd()} alt={course.title} width={500} height={500}
                    className='w-full h-42.5 object-cover rounded-t-xl'
                />
                <div className='font-game p-4 flex-1 flex flex-col'>
                    <h2 className='text-lg font-light text-gray-500'>Course</h2>
                    <h2 className='text-2xl line-clamp-2 min-h-14'>{course.title}</h2>
                    <h2 className='mt-auto pt-3 text-gray-300 text-lg'>{course?.completedLessons} Completed <span>out of {course?.totalLessons}</span></h2>
                    <Progress value={course?.totalLessons ? (course.completedLessons / course.totalLessons) * 100 : 0} />
                </div>
            </div>
        </Link>

    )
}

export default CourseProgressCard
