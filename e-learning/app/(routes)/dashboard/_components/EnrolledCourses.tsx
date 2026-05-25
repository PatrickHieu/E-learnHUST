"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import axios from "axios";
import { set } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import CourseProgressCard from "./CourseProgressCard";

export type EnrolledCourseInfo = {
    courseId: number,
    title: string,
    bannerImage: string,
    level: string,
    editorType: string,
    xpEarned: number,
    totalXp: number,
    completedLessons: number,
    totalLessons: number,
}

function EnrolledCourses() {
    const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourseInfo[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        GetUserEnrolledCourse();
    }, []);


    const GetUserEnrolledCourse = async () => {
        setLoading(true);
        const result = await axios.get('/api/course?courseid=enrolled');
        console.log(result?.data);
        setEnrolledCourses(result.data);
        setLoading(false);
    }

    return (
        <div className="mt-8">
            <h2 className="font-game text-3xl mb-2">Enrolled Courses</h2>
            {loading&& <Skeleton className="w-full rounded-2xl my-5"/>}
            {enrolledCourses?.length == 0 ?
                <div className="flex flex-col items-center gap-3 p-4 border rounded-2xl bg-zinc-900">
                    <Image src="/books.png" alt="book"
                        width={90}
                        height={90} />

                    <h2 className="font-game text-xl text-center">
                        You have not enrolled in any courses yet. Browse courses and start learning today...
                    </h2>
                    <Link href={"/courses"}>
                        <Button variant={"pixel"} size={"lg"} className="mt-4 font-game text-xl">
                            Browse All Courses
                        </Button>
                    </Link>
                </div>
                :
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5 object-cover">
                    {
                        enrolledCourses?.map((course, index) => (
                            <div>
                                <CourseProgressCard course={course} />
                            </div>
                        ) )
                    }
                </div>
            }
        </div>
    )
}

export default EnrolledCourses;
