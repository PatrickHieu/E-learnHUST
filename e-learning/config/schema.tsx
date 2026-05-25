import { integer, json, pgTable, varchar, timestamp } from "drizzle-orm/pg-core";


export const usersTable = pgTable("users", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
    points: integer().default(0),
    subscription: varchar()
});

export const CoursesTable = pgTable("courses", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    courseId: integer().notNull().unique(),
    title: varchar().notNull(),
    desc: varchar().notNull(),
    bannerImage: varchar().notNull(),
    level: varchar().default("beginner"),
    tags: varchar(),
    editorType: varchar(),
    unlockCost: integer().default(0),
});

export const CourseChapterTable = pgTable("courseChapters", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    chapterId: integer(),
    courseId: integer().notNull(),
    name: varchar(),
    desc: varchar(),
});

export const EnrolledCourseTable = pgTable('enrolledCourse', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar(),
    courseId: integer(),
    enrollDate: timestamp().defaultNow(),
    xpEarned: integer()
})

// Multi-modal lessons (Phase 2). A chapter is an ordered sequence of lessons
// whose `type` decides how the student client renders the body and how the
// completion gate works. `content` is a discriminated JSON payload — see the
// LessonContent union below for the per-type shape.
export const LessonsTable = pgTable('lessons', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    courseId: integer().notNull(),
    chapterId: integer().notNull(),
    slug: varchar({ length: 255 }).notNull(),
    orderIndex: integer().notNull().default(0),
    type: varchar({ length: 32 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    xp: integer().notNull().default(0),
    content: json().notNull(),
});

export const CompletedLessonTable = pgTable('completedLesson', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar().notNull(),
    courseId: integer().notNull(),
    chapterId: integer().notNull(),
    lessonId: integer().notNull(),
    completedAt: timestamp().defaultNow(),
});

export type LessonType = 'video' | 'pdf' | 'exercise';

export type VideoLessonContent = {
    provider: 'youtube' | 'vimeo' | 'native';
    url: string;
    durationSec?: number;
};

export type PdfLessonContent = {
    pdfUrl: string;
    pageCount?: number;
};

export type ExerciseLessonContent = {
    content: string;
    task: string;
    hint: string;
    hintXp: number;
    starterCode: Record<string, string>;
    regex?: string;
    expectedOutput?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
};

export type LessonContent =
    | ({ type: 'video' } & VideoLessonContent)
    | ({ type: 'pdf' } & PdfLessonContent)
    | ({ type: 'exercise' } & ExerciseLessonContent);
