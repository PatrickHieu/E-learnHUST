import { Suspense } from "react";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/config/db";
import { CoursesTable, PaymentsTable } from "@/config/schema";
import { checkRole } from "@/lib/checkRole";
import { formatVnd } from "@/lib/course-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wallet,
  ShoppingCart,
  Star as StarIcon,
  TrendingUp,
} from "lucide-react";
import RevenueChart, { type RevenuePoint } from "./RevenueChart";
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
    </div>
  );
}

function StatCard({
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
