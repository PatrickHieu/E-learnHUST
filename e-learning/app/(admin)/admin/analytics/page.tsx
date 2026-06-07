import { Suspense } from "react";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/config/db";
import {
  CompletedLessonTable,
  CoursesTable,
  EnrolledCourseTable,
  PaymentsTable,
  usersTable,
} from "@/config/schema";
import { checkRole } from "@/lib/checkRole";
import { formatVnd } from "@/lib/course-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wallet,
  ShoppingCart,
  Star as StarIcon,
  TrendingUp,
  Users,
  GraduationCap,
  Activity,
  CheckCircle2,
} from "lucide-react";
import RevenueChart, { type RevenuePoint } from "./RevenueChart";
import UserActivityChart, { type ActivityPoint } from "./UserActivityChart";
import RangePicker from "./RangePicker";

// Inclusive day window: subtract (days - 1) so range=7 = today plus the
// previous six full days, totalling 7 buckets when zero-filled.
function rangeCutoff(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

// Walk every day in the window and merge against the DB rows so the
// chart shows a continuous line, including days with zero revenue.
function zeroFill(
  rows: { day: string; revenue: number; txns: number }[],
  days: number,
): RevenuePoint[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: RevenuePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const hit = byDay.get(key);
    out.push({
      day: key,
      revenue: hit ? Number(hit.revenue) : 0,
      txns: hit ? Number(hit.txns) : 0,
    });
  }
  return out;
}

// Same shape as zeroFill but for the DAU/completions series. Kept
// separate so the field types stay tight.
function zeroFillActivity(
  rows: { day: string; dau: number; completions: number }[],
  days: number,
): ActivityPoint[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: ActivityPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const hit = byDay.get(key);
    out.push({
      day: key,
      dau: hit ? Number(hit.dau) : 0,
      completions: hit ? Number(hit.completions) : 0,
    });
  }
  return out;
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  if (!(await checkRole("admin"))) {
    redirect("/admin");
  }

  const sp = await searchParams;
  const requested = Number(sp?.range ?? 30);
  const days = [7, 30, 90].includes(requested) ? requested : 30;
  const cutoff = rangeCutoff(days);

  // ---- Headline metrics (lifetime + in-range) ----
  const [
    [lifetimeRevenue],
    [rangeRevenue],
    [rangeTxns],
    [rangeStarUnlocks],
  ] = await Promise.all([
    db
      .select({ value: sql<number>`COALESCE(SUM(${PaymentsTable.amountVnd}), 0)::bigint` })
      .from(PaymentsTable)
      .where(
        and(
          isNotNull(PaymentsTable.amountVnd),
          eq(PaymentsTable.status, "succeeded"),
        ),
      ),
    db
      .select({ value: sql<number>`COALESCE(SUM(${PaymentsTable.amountVnd}), 0)::bigint` })
      .from(PaymentsTable)
      .where(
        and(
          isNotNull(PaymentsTable.amountVnd),
          eq(PaymentsTable.status, "succeeded"),
          gte(PaymentsTable.createdAt, cutoff),
        ),
      ),
    db
      .select({ value: sql<number>`COUNT(*)::int` })
      .from(PaymentsTable)
      .where(
        and(
          isNotNull(PaymentsTable.amountVnd),
          eq(PaymentsTable.status, "succeeded"),
          gte(PaymentsTable.createdAt, cutoff),
        ),
      ),
    db
      .select({ value: sql<number>`COUNT(*)::int` })
      .from(PaymentsTable)
      .where(
        and(
          eq(PaymentsTable.method, "stars"),
          eq(PaymentsTable.status, "succeeded"),
          gte(PaymentsTable.createdAt, cutoff),
        ),
      ),
  ]);

  // ---- Daily revenue series ----
  const dailyRows = await db
    .select({
      day: sql<string>`TO_CHAR(${PaymentsTable.createdAt}::date, 'YYYY-MM-DD')`,
      revenue: sql<number>`COALESCE(SUM(${PaymentsTable.amountVnd}), 0)::bigint`,
      txns: sql<number>`COUNT(*)::int`,
    })
    .from(PaymentsTable)
    .where(
      and(
        isNotNull(PaymentsTable.amountVnd),
        eq(PaymentsTable.status, "succeeded"),
        gte(PaymentsTable.createdAt, cutoff),
      ),
    )
    .groupBy(sql`${PaymentsTable.createdAt}::date`)
    .orderBy(sql`${PaymentsTable.createdAt}::date`);

  const chartData = zeroFill(
    dailyRows.map((r) => ({
      day: r.day,
      revenue: Number(r.revenue),
      txns: Number(r.txns),
    })),
    days,
  );

  // ---- Top grossing courses ----
  const topRows = await db
    .select({
      courseId: PaymentsTable.courseId,
      revenue: sql<number>`COALESCE(SUM(${PaymentsTable.amountVnd}), 0)::bigint`,
      txns: sql<number>`COUNT(*)::int`,
    })
    .from(PaymentsTable)
    .where(
      and(
        isNotNull(PaymentsTable.amountVnd),
        eq(PaymentsTable.status, "succeeded"),
        gte(PaymentsTable.createdAt, cutoff),
      ),
    )
    .groupBy(PaymentsTable.courseId)
    .orderBy(desc(sql`COALESCE(SUM(${PaymentsTable.amountVnd}), 0)`))
    .limit(5);

  // Join course titles for display.
  const courseIds = topRows.map((r) => r.courseId);
  const courses = courseIds.length
    ? await db
        .select({
          courseId: CoursesTable.courseId,
          title: CoursesTable.title,
        })
        .from(CoursesTable)
    : [];
  const titleByCourseId = new Map(courses.map((c) => [c.courseId, c.title]));

  // ---- User-quality funnel + activity series ----
  // The funnel shows how many learners reach each engagement stage:
  // registered → enrolled in ≥1 course → completed ≥1 lesson in range →
  // active right now (last 7 days). Each step is a server-side COUNT
  // DISTINCT so big tables don't pull into memory.
  const [
    [totalUsersRow],
    [enrolledUsersRow],
    [activeInRangeRow],
    [activeLast7Row],
    [totalCompletionsInRangeRow],
  ] = await Promise.all([
    db.select({ value: sql<number>`COUNT(*)::int` }).from(usersTable),
    db
      .select({
        value: sql<number>`COUNT(DISTINCT ${EnrolledCourseTable.userId})::int`,
      })
      .from(EnrolledCourseTable),
    db
      .select({
        value: sql<number>`COUNT(DISTINCT ${CompletedLessonTable.userId})::int`,
      })
      .from(CompletedLessonTable)
      .where(gte(CompletedLessonTable.completedAt, cutoff)),
    db
      .select({
        value: sql<number>`COUNT(DISTINCT ${CompletedLessonTable.userId})::int`,
      })
      .from(CompletedLessonTable)
      .where(gte(CompletedLessonTable.completedAt, rangeCutoff(7))),
    db
      .select({ value: sql<number>`COUNT(*)::int` })
      .from(CompletedLessonTable)
      .where(gte(CompletedLessonTable.completedAt, cutoff)),
  ]);

  const totalUsers = Number(totalUsersRow.value);
  const enrolledUsers = Number(enrolledUsersRow.value);
  const activeInRange = Number(activeInRangeRow.value);
  const activeLast7 = Number(activeLast7Row.value);
  const totalCompletionsInRange = Number(totalCompletionsInRangeRow.value);
  // Average lessons completed per active learner in the window.
  // Don't divide by zero when no one's active yet.
  const avgCompletionsPerActive =
    activeInRange > 0
      ? Math.round((totalCompletionsInRange / activeInRange) * 10) / 10
      : 0;
  // Conversion rates as percentages, rounded to whole points.
  const pct = (num: number, den: number) =>
    den > 0 ? Math.round((num / den) * 100) : 0;

  // ---- DAU series ----
  const activityRows = await db
    .select({
      day: sql<string>`TO_CHAR(${CompletedLessonTable.completedAt}::date, 'YYYY-MM-DD')`,
      dau: sql<number>`COUNT(DISTINCT ${CompletedLessonTable.userId})::int`,
      completions: sql<number>`COUNT(*)::int`,
    })
    .from(CompletedLessonTable)
    .where(gte(CompletedLessonTable.completedAt, cutoff))
    .groupBy(sql`${CompletedLessonTable.completedAt}::date`)
    .orderBy(sql`${CompletedLessonTable.completedAt}::date`);

  const activityData = zeroFillActivity(
    activityRows.map((r) => ({
      day: r.day,
      dau: Number(r.dau),
      completions: Number(r.completions),
    })),
    days,
  );

  return (
    <div className="font-sans flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Revenue, transactions, and star-unlock activity across the platform.
          </p>
        </div>
        <Suspense fallback={null}>
          <RangePicker />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Lifetime revenue"
          value={formatVnd(Number(lifetimeRevenue.value))}
          icon={<Wallet className="w-4 h-4 text-zinc-400" />}
        />
        <StatCard
          label={`Revenue (last ${days}d)`}
          value={formatVnd(Number(rangeRevenue.value))}
          icon={<TrendingUp className="w-4 h-4 text-zinc-400" />}
        />
        <StatCard
          label={`Paid txns (last ${days}d)`}
          value={String(Number(rangeTxns.value))}
          icon={<ShoppingCart className="w-4 h-4 text-zinc-400" />}
        />
        <StatCard
          label={`Star unlocks (last ${days}d)`}
          value={String(Number(rangeStarUnlocks.value))}
          icon={<StarIcon className="w-4 h-4 text-yellow-500" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue over time</CardTitle>
          <p className="text-xs text-zinc-500">
            Daily total of mock-checkout transactions, in VND. Star-unlocks
            don&apos;t affect this curve — they have no monetary amount.
          </p>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Top grossing courses (last {days}d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topRows.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No paid transactions in this window.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-4 font-medium">Course</th>
                  <th className="py-2 pr-4 text-right font-medium">Transactions</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topRows.map((row) => (
                  <tr
                    key={row.courseId}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2 pr-4">
                      {titleByCourseId.get(row.courseId) ??
                        `Course #${row.courseId}`}
                    </td>
                    <td className="py-2 pr-4 text-right text-zinc-500">
                      {Number(row.txns)}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {formatVnd(Number(row.revenue))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ─── User quality ───────────────────────────────────────────── */}
      <div className="pt-2">
        <h2 className="text-xl font-semibold tracking-tight">User quality</h2>
        <p className="text-sm text-zinc-500 mt-1">
          How many learners reach each engagement stage, and how active they are right now.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Registered"
          value={String(totalUsers)}
          icon={<Users className="w-4 h-4 text-zinc-400" />}
          sub={`${pct(enrolledUsers, totalUsers)}% enrolled in ≥1 course`}
        />
        <StatCard
          label="Enrolled"
          value={String(enrolledUsers)}
          icon={<GraduationCap className="w-4 h-4 text-zinc-400" />}
          sub={`${pct(activeInRange, enrolledUsers)}% active in last ${days}d`}
        />
        <StatCard
          label={`Active (last ${days}d)`}
          value={String(activeInRange)}
          icon={<Activity className="w-4 h-4 text-green-500" />}
          sub={`${activeLast7} also active in last 7d`}
        />
        <StatCard
          label="Avg lessons / active learner"
          value={String(avgCompletionsPerActive)}
          icon={<CheckCircle2 className="w-4 h-4 text-zinc-400" />}
          sub={`${totalCompletionsInRange} total completions`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Active learners per day (last {days}d)
          </CardTitle>
          <p className="text-xs text-zinc-500">
            Number of distinct learners who completed at least one lesson on that day.
            Days with zero activity render as blank bars so the timeline stays continuous.
          </p>
        </CardHeader>
        <CardContent>
          <UserActivityChart data={activityData} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
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
        {sub && (
          <p className="text-xs text-zinc-500 mt-1">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}
