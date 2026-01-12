"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import CourseDetailBanner from './_components/CourseDetailBanner';
import axios from 'axios';
import { Course } from '../_components/CourseList';
import CourseChapter from './_components/CourseChapter';
import CourseStatus from './_components/CourseStatus';
import Upgrade from '../../dashboard/_components/Upgrade';
import ComunityHelp from './_components/ComunityHelp';


function CourseDetail() {

    const { courseId } = useParams();
    const [CourseDetail, setCourseDetail] = useState<Course>();
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        courseId && GetCourseDetail();
    }, [courseId])


    const GetCourseDetail = async () => {
        setLoading(true);
        const result = await axios.get('/api/course?courseId=' + courseId);
        console.log(result.data);
        setCourseDetail(result?.data);
        setLoading(false);
    }

    return (
        <div>
            <CourseDetailBanner loading={loading}
                courseDetail={CourseDetail}
                refreshData={()=>GetCourseDetail}
            />
            <div className='grid grid-cols-3 p-10 md:px-24 lg:px-36 gap-7'>
                <div className='col-span-2'>
                    <CourseChapter
                        loading={loading}
                        courseDetail={CourseDetail} />
                </div>
                <div>
                    <CourseStatus courseDetail={CourseDetail} />
                    <Upgrade />
                    <ComunityHelp />
                </div>
            </div>
        </div>
    )
}

export default CourseDetail
