import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import {
  CompletedExerciseTable,
  CourseChapterTable,
  EnrolledCourseTable,
  usersTable,
} from "@/config/schema";
import { and, eq, sql } from "drizzle-orm";

type ExerciseSpec = { name: string; slug: string; xp: number; difficulty: string };

export async function POST(req: NextRequest) {
  const user = await currentUser();
  const userId = user?.id;
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  if (!userId || !userEmail) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { courseId, chapterId, exerciseId } = await req.json();

  if (
    typeof courseId !== "number" ||
    typeof chapterId !== "number" ||
    typeof exerciseId !== "number"
  ) {
    return NextResponse.json(
      { error: "courseId, chapterId, exerciseId must be numbers" },
      { status: 400 },
    );
  }

  // Look up the canonical XP value for this exercise from the chapter spec
  // — never trust the client.
  const [chapter] = await db
    .select()
    .from(CourseChapterTable)
    .where(
      and(
        eq(CourseChapterTable.courseId, courseId),
        eq(CourseChapterTable.chapterId, chapterId),
      ),
    )
    .limit(1);

  if (!chapter || !Array.isArray(chapter.exercises)) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const exercises = chapter.exercises as ExerciseSpec[];
  const exerciseSpec = exercises[exerciseId - 1];

  if (!exerciseSpec) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  const xpEarned = exerciseSpec.xp ?? 0;

  // Idempotency: if this exercise is already completed by this user, no-op.
  const existing = await db
    .select()
    .from(CompletedExerciseTable)
    .where(
      and(
        eq(CompletedExerciseTable.userId, userId),
        eq(CompletedExerciseTable.courseId, courseId),
        eq(CompletedExerciseTable.chapterId, chapterId),
        eq(CompletedExerciseTable.exerciseId, exerciseId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ alreadyCompleted: true, record: existing[0] });
  }

  const [record] = await db
    .insert(CompletedExerciseTable)
    .values({
      userId,
      courseId,
      chapterId,
      exerciseId,
    })
    .returning();

  // Credit XP to this user's enrollment only — previously this update was
  // missing the userId filter and credited every enrollment of the course.
  await db
    .update(EnrolledCourseTable)
    .set({ xpEarned: sql`${EnrolledCourseTable.xpEarned} + ${xpEarned}` })
    .where(
      and(
        eq(EnrolledCourseTable.courseId, courseId),
        eq(EnrolledCourseTable.userId, userId),
      ),
    );

  // usersTable is keyed by email (its unique identity column), so we still
  // look up the user record by email here even though FK tables use Clerk's
  // user.id.
  await db
    .update(usersTable)
    .set({ points: sql`${usersTable.points} + ${xpEarned}` })
    .where(eq(usersTable.email, userEmail));

  return NextResponse.json({ record, xpEarned });
}
