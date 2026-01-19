import { currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/config/db';
import { CompletedExerciseTable, EnrolledCourseTable, usersTable } from '@/config/schema';
import { eq, sql } from 'drizzle-orm';


export async function POST(req: NextRequest) {
    const { courseId, chapterId, exerciseId, xpEarned } = await req.json();
    const user = await currentUser();

    const result = await db.insert(CompletedExerciseTable).values({
      userId: user?.primaryEmailAddress?.emailAddress,
      courseId: courseId,
      chapterId: chapterId,
      exerciseId: exerciseId,
    }).returning();

    //Update Course XP Earned
    await db
      .update(EnrolledCourseTable)
      .set({
        xpEarned: sql`${EnrolledCourseTable.xpEarned} + ${xpEarned}`,
      })
      .where(eq(EnrolledCourseTable.courseId, courseId));

    //Update User XP Earned 
    await db
      .update(usersTable)
      .set({
        points: sql`${usersTable.points} + ${xpEarned}`,
      }) // @ts-ignore
      .where(eq(usersTable.email, user?.primaryEmailAddress?.emailAddress));

    return NextResponse.json(result);
}