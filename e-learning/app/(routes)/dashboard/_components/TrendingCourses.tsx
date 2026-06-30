"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";
import { Flame, ChartNoAxesColumnIncreasingIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type TrendingCourse = {
  courseId: number;
  title: string;
  desc: string;
  level: string;
  bannerImage: string;
  unlockCost: number | null;
  enrollmentCount: number;
};

const MAX_VISIBLE = 4;

function TrendingCourses() {
  const [courses, setCourses] = useState<TrendingCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await axios.get("/api/course?sort=trending");
        if (!cancelled) setCourses(result.data ?? []);
      } catch (err) {
        console.error("Error fetching trending courses:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Hide the whole section if no course has any enrollments yet — a dashboard
  // full of "0 learners" cards would be embarrassing.
  const visible = courses.filter((c) => c.enrollmentCount > 0).slice(0, MAX_VISIBLE);

  if (!loading && visible.length === 0) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-2">
        <Flame className="text-orange-400 w-7 h-7" />
        <h2 className="font-game text-3xl">Trending Now</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
          <Skeleton className="h-[180px] w-full rounded-xl" />
          <Skeleton className="h-[180px] w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5 items-stretch">
          {visible.map((course) => (
            <Link key={course.courseId} href={`/courses/${course.courseId}`} className="h-full block">
              <div className="h-full flex flex-col border-4 rounded-xl hover:bg-zinc-900 cursor-pointer overflow-hidden">
                <div className="relative">
                  <Image
                    src={course.bannerImage.trimEnd()}
                    alt={course.title}
                    width={400}
                    height={400}
                    className="w-full h-30 object-cover"
                  />
                  <span className="absolute top-2 right-2 bg-orange-500/90 text-white font-game text-sm px-2 py-1 rounded">
                    {course.enrollmentCount} learners
                  </span>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="font-game text-xl line-clamp-1">{course.title}</h3>
                  <p className="font-game text-sm text-gray-400 line-clamp-2 min-h-10">{course.desc}</p>
                  <div className="flex items-center gap-3 mt-auto pt-2">
                    <span className="bg-zinc-800 flex gap-2 font-game p-1 px-3 rounded-2xl items-center inline-flex text-green-500 text-sm">
                      <ChartNoAxesColumnIncreasingIcon className="h-3 w-3" />
                      {course.level}
                    </span>
                    {course.unlockCost && course.unlockCost > 0 ? (
                      <span className="font-game text-sm text-yellow-400">
                        {course.unlockCost} ⭐
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default TrendingCourses;
