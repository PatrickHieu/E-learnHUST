import { id } from "date-fns/locale";
import { integer, json, pgTable, varchar, timestamp } from "drizzle-orm/pg-core";


export const usersTable = pgTable("users", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
    points: integer().default(0),
    subcription: varchar()
});

export const CoursesTable = pgTable("courses", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    courseId: integer().notNull().unique(),
    title: varchar().notNull(),
    desc: varchar().notNull(),
    bannerImage: varchar().notNull(),
    level: varchar().default("beginner"),
    tags: varchar()
});

export const CourseChapterTable = pgTable("courseChapters", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    chapterId: integer(),
    courseId: integer().notNull(),
    name: varchar(),
    desc: varchar(),
    excercises: json(),
});

export const EnrolledCourseTable = pgTable('enrolledCourse', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar(),
    courseId: integer(),
    enrollDate: timestamp().defaultNow(),
    xpEarned: integer()
})