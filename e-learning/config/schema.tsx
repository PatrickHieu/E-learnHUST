import { integer, json, pgTable, unique, varchar, timestamp } from "drizzle-orm/pg-core";


export const usersTable = pgTable("users", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
    // bcrypt hash of the user's password. Nullable so existing pre-Auth.js
    // rows (and any future OAuth-only flows) can sit without one — the
    // sign-in endpoint refuses to authenticate any row where this is NULL.
    passwordHash: varchar({ length: 255 }),
    // 'student' | 'instructor' | 'admin'. Replaces Clerk publicMetadata.role
    // as the single source of truth for access gates.
    role: varchar({ length: 16 }).default("student").notNull(),
    // Spendable star balance — incremented on lesson completion,
    // decremented when a learner unlocks an intermediate course. This
    // is what the paywall checks against.
    points: integer().default(0),
    // Total stars EVER earned. Only ever increases — unlocks never
    // touch this column. Used by the leaderboard so spending stars on
    // courses doesn't make a learner drop in the rankings.
    lifetimePoints: integer().default(0).notNull(),
    // 'pro' means the learner bought the unlimited-access subscription
    // (see /api/subscription/checkout). Anything else (null / 'FREE')
    // is treated as no subscription. Pro bypasses every tier paywall.
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
    // Stars (XP) a learner must spend to enrol in an intermediate course.
    // 0 means "auto-compute from chapter count" — see lib/course-access.
    unlockCost: integer().default(0),
    // VND price an advanced course costs in the mock checkout. 0 means
    // "auto-pick a stable default per courseId" — see lib/course-access.
    priceVnd: integer().default(0),
});

export const CourseChapterTable = pgTable("courseChapters", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    chapterId: integer(),
    courseId: integer().notNull(),
    name: varchar(),
    desc: varchar(),
});

// (userId, courseId) is the natural composite key — a learner only
// enrols once per course. The unique constraint defends against
// race conditions where two near-simultaneous unlock requests slip
// past a SELECT-then-INSERT check (Neon's HTTP driver has no
// transactions). Combined with onConflictDoNothing() at the insert
// site it means a double-click can never double-charge stars.
export const EnrolledCourseTable = pgTable('enrolledCourse', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar(),
    courseId: integer(),
    enrollDate: timestamp().defaultNow(),
    xpEarned: integer(),
}, (t) => [
    unique('enrolled_course_user_course_unique').on(t.userId, t.courseId),
]);

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

// (userId, lessonId) is the natural composite key — a learner only
// completes a given lesson once. Unique constraint defends against
// double-click double-credit on Mark Completed and against the
// equivalent server-side race in the run-up. Insert sites use
// onConflictDoNothing() so the duplicate just no-ops.
export const CompletedLessonTable = pgTable('completedLesson', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar().notNull(),
    courseId: integer().notNull(),
    chapterId: integer().notNull(),
    lessonId: integer().notNull(),
    completedAt: timestamp().defaultNow(),
}, (t) => [
    unique('completed_lesson_user_lesson_unique').on(t.userId, t.lessonId),
]);

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
}, (t) => [
    // Same defense as the other two — a learner can only pass any
    // single checkpoint once.
    unique('completed_video_quiz_user_lesson_idx_unique').on(
        t.userId, t.lessonId, t.checkpointIndex,
    ),
]);

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

// A single stdin/stdout test case used to grade C, C++ and Python
// exercises server-side via Judge0. The grader feeds `input` to the
// compiled program, captures stdout, normalises whitespace, and
// compares to `expectedOutput`. `hidden` test cases are run during
// grading but their input/expected text is never sent to the client —
// only the pass/fail flag, so students can't reverse-engineer the
// expected answer from the page source.
export type ExerciseTestCase = {
    name?: string;
    input: string;
    expectedOutput: string;
    hidden?: boolean;
};

export type ExerciseLessonContent = {
    content: string;
    task: string;
    hint: string;
    hintXp: number;
    starterCode: Record<string, string>;
    // Legacy fallback validators. When `testcases` is populated for a
    // C / C++ / Python lesson, the grader uses it and ignores these.
    // HTML/CSS/JS lessons keep using `regex` because there's no
    // headless DOM judge wired in.
    regex?: string;
    expectedOutput?: string;
    testcases?: ExerciseTestCase[];
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

// Records every course-access transaction — both star-unlocks (where the
// learner spends accumulated XP) and mock-VND purchases (Phase 5 demo
// checkout; will be swapped for a real provider later). Rows here drive
// the admin revenue/user-quality charts and are what /admin/users would
// surface as a learner's purchase history.
export const PaymentsTable = pgTable('payments', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar().notNull(),
    courseId: integer().notNull(),
    // 'stars' for star-unlocks, 'mock_vnd' for the Phase 5 demo checkout.
    // Future: 'stripe', 'vnpay', 'momo'.
    method: varchar({ length: 32 }).notNull(),
    // Set for VND-based transactions; null for star-unlocks.
    amountVnd: integer(),
    // Set for star-unlocks; null for VND transactions.
    starsSpent: integer(),
    // 'succeeded' for completed enrolments; 'pending' / 'failed' /
    // 'refunded' kept for future real-provider flows.
    status: varchar({ length: 16 }).notNull(),
    createdAt: timestamp().defaultNow(),
});
