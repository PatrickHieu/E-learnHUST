"use client";
import { createContext } from "react";
import type { Course } from "../_components/CourseList";

// Shared course detail surface for everything under /courses/[courseId].
// Lives in a Context so the layout's single fetch survives across
// navigation between the course landing page and any of its lesson
// pages — slug changes never re-mount the layout, so the cached
// detail (and the sidebar that reads it) stays put.
export type CourseDataContextValue = {
  courseDetail: Course | undefined;
  loading: boolean;
  /**
   * Re-fetches /api/course?courseId=X. Called after Mark Completed so
   * the sidebar's green check-marks and completedLessonIds update
   * without a full page reload.
   */
  refreshCourseDetail: () => Promise<void>;
};

export const CourseDataContext = createContext<CourseDataContextValue>({
  courseDetail: undefined,
  loading: false,
  refreshCourseDetail: async () => {},
});
