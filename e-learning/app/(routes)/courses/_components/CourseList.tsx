"use client"
import axios from 'axios'
import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ChartNoAxesColumnIncreasingIcon, Search, X } from 'lucide-react'
import Link from 'next/link'

export type Course = {
    id: number,
    courseId: number,
    title: string,
    desc: string,
    level: string,
    bannerImage: string,
    tag: string,
    unlockCost?: number,
    chapters?: Chapter[],
    userEnrolled?: boolean,
    courseEnrolledInfo?: CourseEnrolledInfo,
    completedLessonIds?: number[]
}

export type CourseEnrolledInfo = {
    xpEarned: number,
    enrolledDate: any,
}

export type Chapter = {
    chapterId: number,
    courseId: number,
    desc: string,
    name: string,
    id: number,
    lessons: Lesson[]
}

export type Lesson = {
    id: number,
    courseId: number,
    chapterId: number,
    slug: string,
    orderIndex: number,
    type: string, // 'video' | 'pdf' | 'exercise' | 'quiz'
    title: string,
    xp: number,
    // Set by /api/course; true for quiz, exercise, and video lessons with
    // in-video quiz checkpoints. See lib/chapter-gating.ts.
    gating?: boolean,
}

type Props = {
    smallerCard?: boolean,
    maxLimit?: number,
    /**
     * When true, render the search input + level filter chips above the grid.
     * Off on the dashboard (re-uses this component as a pure card grid).
     */
    showFilters?: boolean,
}

const LEVELS = [
    { value: null, label: 'All' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
] as const;

function CourseList({ smallerCard = false, maxLimit = 100, showFilters = false }: Props) {

    const [coursesList, setCoursesList] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');
    const [level, setLevel] = useState<string | null>(null);
    const isInitialMount = useRef(true);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (q.trim()) params.set('q', q.trim());
            if (level) params.set('level', level);
            const qs = params.toString();
            const url = qs ? `/api/course?${qs}` : '/api/course';
            const result = await axios.get<Course[]>(url);
            setCoursesList(Array.isArray(result.data) ? result.data : []);
        } catch (err) {
            console.error('Error fetching courses:', err);
            setCoursesList([]);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch is immediate; subsequent fetches debounce by 300ms so
    // typing in the search box doesn't fire one request per keystroke.
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            fetchCourses();
            return;
        }
        const id = setTimeout(fetchCourses, 300);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, level]);

    const visibleCourses = coursesList.slice(0, maxLimit);

    return (
        <div>
            {showFilters && (
                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search courses by title or tag..."
                            className="font-game w-full h-10 pl-9 pr-9 rounded-md border-2 border-zinc-700 bg-zinc-950 text-white text-lg focus:outline-none focus:border-yellow-400"
                        />
                        {q && (
                            <button
                                type="button"
                                onClick={() => setQ('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                aria-label="Clear search"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {LEVELS.map((opt) => {
                            const active = opt.value === level;
                            return (
                                <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => setLevel(opt.value)}
                                    className={`font-game text-base px-3 py-1.5 rounded-md border-2 transition-colors ${
                                        active
                                            ? 'bg-yellow-400 text-black border-yellow-400'
                                            : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {!loading && visibleCourses.length === 0 ? (
                <div className="font-game text-center text-zinc-500 p-10 border-2 border-dashed border-zinc-800 rounded-2xl">
                    No courses match your search.
                </div>
            ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5 mt-3'>
                    {visibleCourses.map((course, index) => (
                        <Link href={'/courses/' + course?.courseId} key={course?.courseId ?? index}>
                            <div className='border-4 rounded-xl hover:bg-zinc-900 cursor-pointer'>
                                <Image src={course?.bannerImage.trimEnd()} alt={course?.title} width={400} height={400}
                                    className={`w-full object-cover rounded-t-lg ${smallerCard ? 'h-[120px]' : 'h-[200px]'}`}
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
            )}
        </div>
    )
}

export default CourseList
