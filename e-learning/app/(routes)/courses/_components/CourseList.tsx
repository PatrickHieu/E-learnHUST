"use client"
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { ChartNoAxesColumnIncreasingIcon } from 'lucide-react'
import Link from 'next/link'

export type Course = {
    id: number,
    courseId: number,
    title: string,
    desc: string,
    level: string,
    bannerImage: string,
    tag: string,
    chapters?: Chapter[]
}

type Chapter = {
    chapterId: number,
    courseId: number,
    desc: string,
    name: string,
    id: number,
    excercises: excercise[]


}

type excercise = {
    name: string,
    slug: string,
    xp: number,
    difficulty: string
}

function CourseList() {

    const [coursesList, setCoursesList] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        GetAllCourses();
    }, []);

    const GetAllCourses = async () => {
        setLoading(true);
        const result = await axios.get('/api/course');
        console.log(result);
        setCoursesList(result?.data);
        setLoading(false);
    }

    return (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5 mt-3'>
            {coursesList.map((course, index) => (
                <Link href={'/courses/' + course?.courseId} key={index}>
                    <div className='border-4 rounded-xl hover:bg-zinc-900 cursor-pointer'>
                        <Image src={course?.bannerImage.trimEnd()} alt={course?.title} width={400} height={400}
                            className='w-full h-[200px] object-cover rounded-t-lg'
                        />
                        <div className='p-4'>
                            <h2 className='font-game text-2xl'>
                                {course?.title}
                            </h2>
                            <p className='font-game text-xl text-gray-400 line-clamp-2'>
                                {course?.desc}
                            </p>
                            <h2 className='bg-zinc-800 flex gap-2 font-game p-1 px-4 mt-3 rounded-2xl items-center inline-flex text-green-600 text-lg'>
                                <ChartNoAxesColumnIncreasingIcon className='h-4 w-4' />
                                {course?.level}
                            </h2>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    )
}

export default CourseList
