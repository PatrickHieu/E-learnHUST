import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import {
  CompletedLessonTable,
  CourseChapterTable,
  CoursesTable,
  EnrolledCourseTable,
  LessonsTable,
} from "@/config/schema";
import {
  eq,
  or,
  asc,
  desc,
  ilike,
  inArray,
  and,
  count,
  getTableColumns,
  type SQL,
} from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { isLessonGating } from "@/lib/chapter-gating";
import {
  effectivePriceVnd,
  effectiveUnlockCost,
  getAccessTier,
} from "@/lib/course-access";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawCourseId = searchParams.get("courseId") || searchParams.get("courseid");
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "User not authenticated" },
      { status: 401 },
    );
  }

  // Single-course detail
  if (rawCourseId && rawCourseId !== "enrolled") {
    const courseIdNum = Number(rawCourseId);
    if (!Number.isFinite(courseIdNum)) {
      return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
    }

    const [course] = await db
      .select()
      .from(CoursesTable)
      .where(eq(CoursesTable.courseId, courseIdNum))
      .limit(1);

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const chapterRows = await db
      .select()
      .from(CourseChapterTable)
      .where(eq(CourseChapterTable.courseId, courseIdNum))
      .orderBy(asc(CourseChapterTable.chapterId));

    const lessonRowsRaw = await db
      .select({
        id: LessonsTable.id,
        courseId: LessonsTable.courseId,
        chapterId: LessonsTable.chapterId,
        slug: LessonsTable.slug,
        orderIndex: LessonsTable.orderIndex,
        type: LessonsTable.type,
        title: LessonsTable.title,
        xp: LessonsTable.xp,
        // Pulled so we can compute the gating flag below; stripped from
        // the response so the chapter listing payload stays small.
        content: LessonsTable.content,
      })
      .from(LessonsTable)
      .where(eq(LessonsTable.courseId, courseIdNum))
      .orderBy(asc(LessonsTable.chapterId), asc(LessonsTable.orderIndex));

    // `gating: boolean` — true for the lessons that block the next chapter
    // (standalone quiz / exercise / video with checkpoints). See
    // lib/chapter-gating.ts for the rule.
    const lessonRows = lessonRowsRaw.map(({ content, ...rest }) => ({
      ...rest,
      gating: isLessonGating({ type: rest.type, content }),
    }));

    const enrolledCourse = await db
      .select()
      .from(EnrolledCourseTable)
      .where(
        and(
          eq(EnrolledCourseTable.courseId, courseIdNum),
          eq(EnrolledCourseTable.userId, userId),
        ),
      )
      .limit(1);

    const completed = await db
      .select({ lessonId: CompletedLessonTable.lessonId })
      .from(CompletedLessonTable)
      .where(
        and(
          eq(CompletedLessonTable.courseId, courseIdNum),
          eq(CompletedLessonTable.userId, userId),
        ),
      );

    const chapters = chapterRows.map((ch) => ({
      ...ch,
      lessons: lessonRows.filter((l) => l.chapterId === ch.chapterId),
    }));

    return NextResponse.json({
      ...course,
      chapters,
      userEnrolled: enrolledCourse.length > 0,
      courseEnrolledInfo: enrolledCourse[0],
      completedLessonIds: completed.map((c) => c.lessonId),
    });
  }

  // Dashboard: enrolled-course summary cards
  if (rawCourseId === "enrolled") {
    const enrolledCourses = await db
      .select()
      .from(EnrolledCourseTable)
      .where(eq(EnrolledCourseTable.userId, userId));

    if (enrolledCourses.length === 0) {
      return NextResponse.json([]);
    }

    const courseIds = enrolledCourses
      .map((c) => c.courseId)
      .filter((id): id is number => typeof id === "number");

    const courses = await db
      .select()
      .from(CoursesTable)
      .where(inArray(CoursesTable.courseId, courseIds));

    const lessonsByCourse = await db
      .select({ courseId: LessonsTable.courseId })
      .from(LessonsTable)
      .where(inArray(LessonsTable.courseId, courseIds));

    const completedByCourse = await db
      .select({ courseId: CompletedLessonTable.courseId })
      .from(CompletedLessonTable)
      .where(
        and(
          inArray(CompletedLessonTable.courseId, courseIds),
          eq(CompletedLessonTable.userId, userId),
        ),
      );

    const totalsByCourse = new Map<number, number>();
    for (const l of lessonsByCourse) {
      totalsByCourse.set(l.courseId, (totalsByCourse.get(l.courseId) ?? 0) + 1);
    }
    const completedCountByCourse = new Map<number, number>();
    for (const c of completedByCourse) {
      completedCountByCourse.set(
        c.courseId,
        (completedCountByCourse.get(c.courseId) ?? 0) + 1,
      );
    }

    const result = courses.map((course) => {
      const enrollment = enrolledCourses.find((e) => e.courseId === course.courseId);
      return {
        courseId: course.courseId,
        title: course.title,
        bannerImage: course.bannerImage,
        totalLessons: totalsByCourse.get(course.courseId) ?? 0,
        completedLessons: completedCountByCourse.get(course.courseId) ?? 0,
        xpEarned: enrollment?.xpEarned ?? 0,
        level: course.level,
      };
    });

    return NextResponse.json(result);
  }

  // Default: list all courses. ?sort=trending orders by enrollment count
  // so the dashboard can prioritise high-demand courses.
  const sort = searchParams.get("sort");
  if (sort === "trending") {
    const enrollmentCount = count(EnrolledCourseTable.id);
    const trending = await db
      .select({
        ...getTableColumns(CoursesTable),
        enrollmentCount,
      })
      .from(CoursesTable)
      .leftJoin(
        EnrolledCourseTable,
        eq(EnrolledCourseTable.courseId, CoursesTable.courseId),
      )
      .groupBy(CoursesTable.id)
      .orderBy(desc(enrollmentCount), asc(CoursesTable.id));
    return NextResponse.json(trending);
  }

  // Default: list courses. Supports optional ?q=<text>&level=<level>
  // filters for the /courses search UI. Text match runs across title and
  // tags (case-insensitive substring) so "react" hits both a course
  // titled "React Basics" and one tagged "react,frontend".
  const q = searchParams.get("q")?.trim();
  const level = searchParams.get("level")?.trim();

  const conditions: SQL[] = [];
  if (q) {
    const pattern = `%${q}%`;
    const textMatch = or(
      ilike(CoursesTable.title, pattern),
      ilike(CoursesTable.tags, pattern),
    );
    if (textMatch) conditions.push(textMatch);
  }
  if (level) {
    conditions.push(eq(CoursesTable.level, level));
  }

  const result = conditions.length > 0
    ? await db.select().from(CoursesTable).where(and(...conditions))
    : await db.select().from(CoursesTable);

  // Phase 5: enrich each row with the computed access tier + the actual
  // numeric cost the paywall should display (auto-computed when the
  // admin left the column at 0). We also surface chapter count so the
  // auto-unlock formula stays in lib/course-access and isn't duplicated
  // client-side. Enrolment status is per-user and lets the listing skip
  // the lock overlay for courses the learner already owns.
  const courseIds = result.map((c) => c.courseId);
  const chapterCounts = new Map<number, number>();
  if (courseIds.length > 0) {
    const chapterRows = await db
      .select({
        courseId: CourseChapterTable.courseId,
        chapterId: CourseChapterTable.chapterId,
      })
      .from(CourseChapterTable)
      .where(inArray(CourseChapterTable.courseId, courseIds));
    for (const row of chapterRows) {
      chapterCounts.set(row.courseId, (chapterCounts.get(row.courseId) ?? 0) + 1);
    }
  }
  const enrolledIds = new Set<number>();
  if (courseIds.length > 0) {
    const enrolledRows = await db
      .select({ courseId: EnrolledCourseTable.courseId })
      .from(EnrolledCourseTable)
      .where(
        and(
          eq(EnrolledCourseTable.userId, userId),
          inArray(EnrolledCourseTable.courseId, courseIds),
        ),
      );
    for (const row of enrolledRows) {
      if (row.courseId != null) enrolledIds.add(row.courseId);
    }
  }

  const enriched = result.map((c) => {
    const chapterCount = chapterCounts.get(c.courseId) ?? 0;
    const tier = getAccessTier(c.level);
    return {
      ...c,
      accessTier: tier,
      chapterCount,
      effectiveUnlockCost: effectiveUnlockCost(c.level, c.unlockCost, chapterCount),
      effectivePriceVnd: effectivePriceVnd(c.level, c.priceVnd, c.courseId),
      enrolled: enrolledIds.has(c.courseId),
    };
  });

  return NextResponse.json(enriched);
}
