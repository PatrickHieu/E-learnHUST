"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function EnrolledCourses() {
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    return (
        <div className="mt-8">
            <h2 className="font-game text-3xl mb-2">Enrolled Courses</h2>
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
                <div>
                    Courses List
                </div>
            }
        </div>
    )
}

export default EnrolledCourses;
