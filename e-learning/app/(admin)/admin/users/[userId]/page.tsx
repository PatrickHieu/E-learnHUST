import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/config/db";
import {
  CompletedLessonTable,
  CoursesTable,
  EnrolledCourseTable,
  LessonsTable,
  PaymentsTable,
  usersTable,
} from "@/config/schema";
import { checkRole } from "@/lib/checkRole";
import { formatVnd, getAccessTier } from "@/lib/course-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Star, Mail, BookOpen, Wallet, Trophy } from "lucide-react";

const ROLE_COLOR: Record<string, string> = {
  admin:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40",
  librarian:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40",
  student:
    "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-700/40 dark:text-zinc-300 dark:border-zinc-600",
};

// Vietnamese-style "5 minutes ago" → English short relative timestamp,
// good enough for an activity feed. Falls back to a date for anything
// older than a week so a long list reads cleanly.
function relativeTime(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 7 * 86400) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  if (!(await checkRole("admin"))) {
    redirect("/admin");
  }

  const { userId: idParam } = await params;
  const numericId = Number(idParam);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    notFound();
  }

  // ---- The user row + Clerk metadata for role display ----
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, numericId))
    .limit(1);
  if (!user) {
    notFound();
  }

  const client = await clerkClient();
  const clerkList = await client.users.getUserList({ limit: 500 });
  const clerkRow = clerkList.data.find(
    (cu) => cu.primaryEmailAddress?.emailAddress === user.email,
  );
  const role =
    (clerkRow?.publicMetadata as { role?: string } | undefined)?.role ??
    "student";

  // Activity rows reference users by varchar userId. Real Clerk users
  // land as `user_xxx`; the fake-users seed writes `seed_<emailLocal>`.
  // Look up both so admins can inspect either kind of account.
  const seedUserId = `seed_${user.email.split("@")[0]}`;
  const candidateUserIds = clerkRow
    ? [clerkRow.id, seedUserId]
    : [seedUserId];

  // ---- Enrolments + per-course progress ----
  const enrollments = await db
    .select()
    .from(EnrolledCourseTable)
    .where(inArray(EnrolledCourseTable.userId, candidateUserIds));

  const enrolledCourseIds = Array.from(
    new Set(
      enrollments
        .map((e) => e.courseId)
        .filter((id): id is number => typeof id === "number"),
    ),
  );

  const enrolledCourses = enrolledCourseIds.length
    ? await db
        .select()
        .from(CoursesTable)
        .where(inArray(CoursesTable.courseId, enrolledCourseIds))
    : [];
  const courseById = new Map(enrolledCourses.map((c) => [c.courseId, c]));

  // Total lessons per enrolled course → denominator for the progress bar.
  const lessonsForCourses = enrolledCourseIds.length
    ? await db
        .select({
          courseId: LessonsTable.courseId,
          id: LessonsTable.id,
          xp: LessonsTable.xp,
        })
        .from(LessonsTable)
        .where(inArray(LessonsTable.courseId, enrolledCourseIds))
    : [];
  const lessonCountByCourse = new Map<number, number>();
  for (const l of lessonsForCourses) {
    lessonCountByCourse.set(
      l.courseId,
      (lessonCountByCourse.get(l.courseId) ?? 0) + 1,
    );
  }

  // ---- All completed lessons for this user ----
  const completedLessons = await db
    .select()
    .from(CompletedLessonTable)
    .where(inArray(CompletedLessonTable.userId, candidateUserIds))
    .orderBy(desc(CompletedLessonTable.completedAt));

  const completionsByCourse = new Map<number, number>();
  for (const c of completedLessons) {
    completionsByCourse.set(
      c.courseId,
      (completionsByCourse.get(c.courseId) ?? 0) + 1,
    );
  }

  // Map of completedLessonId → title for the recent-activity feed.
  // Pulled in a single query keyed by id rather than per-row, to avoid
  // N+1.
  const recentLessonIds = completedLessons.slice(0, 20).map((c) => c.lessonId);
  const lessonTitleRows = recentLessonIds.length
    ? await db
        .select({
          id: LessonsTable.id,
          title: LessonsTable.title,
          type: LessonsTable.type,
        })
        .from(LessonsTable)
        .where(inArray(LessonsTable.id, recentLessonIds))
    : [];
  const lessonInfoById = new Map(
    lessonTitleRows.map((l) => [l.id, l]),
  );

  // ---- Payment history ----
  const payments = await db
    .select()
    .from(PaymentsTable)
    .where(inArray(PaymentsTable.userId, candidateUserIds))
    .orderBy(desc(PaymentsTable.createdAt));
  const paymentCourseIds = Array.from(
    new Set(payments.map((p) => p.courseId)),
  );
  const paymentCourses = paymentCourseIds.length
    ? await db
        .select({
          courseId: CoursesTable.courseId,
          title: CoursesTable.title,
        })
        .from(CoursesTable)
        .where(inArray(CoursesTable.courseId, paymentCourseIds))
    : [];
  const paymentCourseTitleById = new Map(
    paymentCourses.map((c) => [c.courseId, c.title]),
  );

  // ---- Quiz attempt summary ----
  const quizCompletions = completedLessons.filter((c) => {
    const info = lessonInfoById.get(c.lessonId);
    return info?.type === "quiz";
  }).length;
  // Total possible quiz lessons across enrolled courses, for context.
  const enrolledQuizLessonCount = lessonsForCourses.length
    ? await db
        .select({ id: LessonsTable.id })
        .from(LessonsTable)
        .where(
          and(
            inArray(LessonsTable.courseId, enrolledCourseIds),
            eq(LessonsTable.type, "quiz"),
          ),
        )
    : [];

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="flex items-center gap-3">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
          <p className="text-sm text-zinc-500 mt-1 flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" />
            {user.email}
          </p>
        </div>
      </div>

      {/* Profile summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryStat
          label="Stars"
          value={String(user.points ?? 0)}
          icon={<Star className="w-4 h-4 text-yellow-500" />}
        />
        <SummaryStat
          label="Enrolments"
          value={String(enrollments.length)}
          icon={<BookOpen className="w-4 h-4 text-zinc-400" />}
        />
        <SummaryStat
          label="Lessons completed"
          value={String(completedLessons.length)}
          icon={<Trophy className="w-4 h-4 text-zinc-400" />}
        />
        <SummaryStat
          label="Quizzes passed"
          value={`${quizCompletions} / ${enrolledQuizLessonCount.length}`}
          icon={<Trophy className="w-4 h-4 text-zinc-400" />}
        />
      </div>

      {/* Profile chips */}
      <Card className="p-5 flex flex-wrap gap-3 items-center">
        <span className="text-xs uppercase text-zinc-500 tracking-wider">
          Role
        </span>
        <span
          className={`px-2 py-0.5 rounded text-xs uppercase border ${
            ROLE_COLOR[role] ?? ROLE_COLOR.student
          }`}
        >
          {role}
        </span>
        <span className="text-xs uppercase text-zinc-500 tracking-wider ml-4">
          Plan
        </span>
        <Badge variant={user.subscription ? "default" : "outline"}>
          {user.subscription || "FREE"}
        </Badge>
        {!clerkRow && (
          <span className="text-xs text-zinc-500 ml-auto">
            No Clerk account — likely a seeded fake user.
          </span>
        )}
      </Card>

      {/* Enrolments + progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Course enrolments</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-sm text-zinc-500">
              This learner hasn&apos;t enrolled in any courses yet.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {enrollments
                .map((e) => {
                  if (e.courseId == null) return null;
                  const course = courseById.get(e.courseId);
                  if (!course) return null;
                  const total = lessonCountByCourse.get(e.courseId) ?? 0;
                  const done = completionsByCourse.get(e.courseId) ?? 0;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return {
                    enrollment: e,
                    course,
                    total,
                    done,
                    pct,
                  };
                })
                .filter((x): x is NonNullable<typeof x> => x !== null)
                .sort((a, b) => b.pct - a.pct)
                .map(({ enrollment, course, total, done, pct }) => (
                  <div
                    key={enrollment.id}
                    className="flex flex-col gap-2 border-b border-zinc-100 dark:border-zinc-900 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Link
                          href={`/admin/courses/${course.courseId}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {course.title}
                        </Link>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {course.level} ·{" "}
                          {getAccessTier(course.level)} tier ·{" "}
                          Enrolled{" "}
                          {enrollment.enrollDate
                            ? relativeTime(enrollment.enrollDate)
                            : "—"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">
                          {done} / {total}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {enrollment.xpEarned ?? 0} XP earned
                        </p>
                      </div>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {completedLessons.length === 0 ? (
            <p className="text-sm text-zinc-500">No completions yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {completedLessons.slice(0, 20).map((c) => {
                const info = lessonInfoById.get(c.lessonId);
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between text-sm border-b border-zinc-100 dark:border-zinc-900 pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <span className="font-medium">
                        {info?.title ?? `Lesson #${c.lessonId}`}
                      </span>
                      {info?.type && (
                        <Badge variant="outline" className="ml-2 text-[10px] uppercase">
                          {info.type}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">
                      {c.completedAt
                        ? relativeTime(c.completedAt)
                        : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-zinc-400" />
            Payment history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No paywall transactions for this learner.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">Course</th>
                  <th className="py-2 pr-4 font-medium">Method</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2 pr-4 text-zinc-500">
                      {p.createdAt ? relativeTime(p.createdAt) : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {paymentCourseTitleById.get(p.courseId) ??
                        `Course #${p.courseId}`}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {p.method.replace("mock_", "")}
                      </Badge>
                    </td>
                    <td className="py-2 text-right font-medium">
                      {p.amountVnd != null
                        ? formatVnd(p.amountVnd)
                        : `${p.starsSpent ?? 0} ⭐`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
