"use client"
import React, { useContext } from 'react'
import CourseDetailBanner from './_components/CourseDetailBanner';
import CourseChapter from './_components/CourseChapter';
import CourseStatus from './_components/CourseStatus';
import Upgrade from '../../dashboard/_components/Upgrade';
import { CourseDataContext } from './CourseDataContext';


function CourseDetail() {
    // Course payload lives on the [courseId]/layout.tsx context now —
    // a single fetch shared by this landing page and every lesson
    // page under it.
    const { courseDetail, loading, refreshCourseDetail } = useContext(CourseDataContext);

    return (
        <div>
            <CourseDetailBanner loading={loading}
                courseDetail={courseDetail}
                refreshData={refreshCourseDetail}
            />
            <div className='grid grid-cols-3 p-10 md:px-24 lg:px-36 gap-7'>
                <div className='col-span-2'>
                    <CourseChapter
                        loading={loading}
                        courseDetail={courseDetail} />
                </div>
                <div>
                    <CourseStatus courseDetail={courseDetail} />
                    <Upgrade />
                </div>
            </div>
        </div>
    )
}

export default CourseDetail
