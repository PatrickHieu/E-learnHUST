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

// Per-checkpoint completion for in-video quizzes. A video lesson's
// inVideoQuizzes array is index-stable; checkpointIndex refers to that
// position. When every checkpoint in a video has a row here for a given
// user, the video lesson itself auto-completes (an entry lands in
// completedLesson).
export const CompletedVideoQuizTable = pgTable('completedVideoQuiz', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar().notNull(),
    courseId: integer().notNull(),
    chapterId: integer().notNull(),
    lessonId: integer().notNull(),
    checkpointIndex: integer().notNull(),
    completedAt: timestamp().defaultNow(),
});

export type LessonType = 'video' | 'pdf' | 'exercise' | 'quiz';

// A quiz that pops up mid-video at a specific timestamp. Playback pauses,
// the question is shown as an overlay, and the student must answer it
// correctly before the video resumes. XP is credited per checkpoint.
export type VideoQuizCheckpoint = {
    timestamp: number;          // seconds into the video
    question: string;           // HTML
    options: string[];          // 2–8 answers (the admin UI fixes this at 4)
    correctIndex: number;       // 0-based, server-validated
    xp: number;
    explanation?: string;       // shown after a correct answer
};

export type VideoLessonContent = {
    provider: 'youtube' | 'vimeo' | 'native';
    url: string;
    durationSec?: number;
    inVideoQuizzes?: VideoQuizCheckpoint[];
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

export type QuizLessonContent = {
    question: string;           // HTML
    options: string[];          // 2–8 answers
    correctIndex: number;       // 0-based; server-validated
    explanation?: string;       // shown after answering
};

export type LessonContent =
    | ({ type: 'video' } & VideoLessonContent)
    | ({ type: 'pdf' } & PdfLessonContent)
    | ({ type: 'exercise' } & ExerciseLessonContent)
    | ({ type: 'quiz' } & QuizLessonContent);
