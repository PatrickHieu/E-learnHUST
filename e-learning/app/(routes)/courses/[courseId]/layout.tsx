"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { Course } from "../_components/CourseList";
import { CourseDataContext } from "./CourseDataContext";

// Client layout under /courses/[courseId]/* — fetches the course
// payload once on mount and on courseId change. The layout stays
// mounted while the learner navigates between lessons (slug /
// chapterId changes don't unmount layouts in Next.js App Router),
// so the sidebar reads from this single cached fetch instead of
// firing /api/course on every lesson load.
export default function CourseLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { courseId } = useParams();
    const [courseDetail, setCourseDetail] = useState<Course | undefined>();
    const [loading, setLoading] = useState(false);

    const refreshCourseDetail = useCallback(async () => {
        if (!courseId) return;
        setLoading(true);
        try {
            const result = await axios.get<Course>(`/api/course?courseId=${courseId}`);
            setCourseDetail(result.data);
        } catch (err) {
            console.error("Failed to load course detail:", err);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        // Reset between course switches so the previous course's data
        // doesn't flash to the new screen before the fetch resolves.
        setCourseDetail(undefined);
        refreshCourseDetail();
    }, [refreshCourseDetail]);

    return (
        <CourseDataContext.Provider
            value={{ courseDetail, loading, refreshCourseDetail }}
        >
            {children}
        </CourseDataContext.Provider>
    );
}
