import "dotenv/config";
import { and, eq, ilike, sql } from "drizzle-orm";
import { db } from "../config/db";
import {
  CourseChapterTable,
  CoursesTable,
  EnrolledCourseTable,
  PaymentsTable,
  usersTable,
} from "../config/schema";
import {
  effectivePriceVnd,
  effectiveUnlockCost,
  getAccessTier,
} from "../lib/course-access";

// Backfills PaymentsTable with realistic-looking transactions for the
// fake students seeded by `seed:fake-users`. Each tier-gated enrolment
// (intermediate → star unlock, advanced → mock VND checkout) becomes
// one Payment row with a date spread between the enrolment date and
// now, so the admin revenue chart has shape across the full 90-day
// window.
//
// Idempotent: skips users that already have a Payment row for that
// course. Safe to re-run after adding new fake users.
//
// Run:  npm run seed:fake-payments

const SEED_DOMAIN_LIKE = "%@seed.codeblock.local";

// Deterministic so re-running the script doesn't shuffle the dataset.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0xFA17EDB1);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

// Paid courses are bought via one of these mock-method labels; the
// revenue chart treats every value here as VND revenue. The bias is
// rough VN market reality: VNPay > MoMo > Visa-Mastercard.
const PAID_METHODS = ["mock_vnpay", "mock_vnpay", "mock_momo", "mock_card"] as const;

async function main() {
  console.log("Seeding fake payments…");

  const fakeUsers = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(ilike(usersTable.email, SEED_DOMAIN_LIKE));

  if (fakeUsers.length === 0) {
    console.warn(
      "No seeded fake users found. Run `npm run seed:fake-users` first.",
    );
    return;
  }
  console.log(`Found ${fakeUsers.length} fake users.`);

  const courses = await db.select().from(CoursesTable);
  const chapterRows = await db
    .select({
      courseId: CourseChapterTable.courseId,
      chapterId: CourseChapterTable.chapterId,
    })
    .from(CourseChapterTable);
  const chapterCounts = new Map<number, number>();
  for (const r of chapterRows) {
    chapterCounts.set(r.courseId, (chapterCounts.get(r.courseId) ?? 0) + 1);
  }

  const courseById = new Map(courses.map((c) => [c.courseId, c]));

  // userId column on EnrolledCourseTable is the seed_<emailLocal> prefix,
  // not the numeric users.id. Reconstruct from the email's local part so
  // the join matches what seed-fake-users used.
  const fakeUserIds = fakeUsers.map((u) => {
    const local = u.email.split("@")[0];
    return `seed_${local}`;
  });

  let starUnlocks = 0;
  let paidPurchases = 0;
  let skippedExisting = 0;

  for (const userId of fakeUserIds) {
    const enrolments = await db
      .select({
        courseId: EnrolledCourseTable.courseId,
        enrollDate: EnrolledCourseTable.enrollDate,
      })
      .from(EnrolledCourseTable)
      .where(eq(EnrolledCourseTable.userId, userId));

    for (const enrol of enrolments) {
      const courseId = enrol.courseId;
      if (courseId == null) continue;
      const course = courseById.get(courseId);
      if (!course) continue;

      const tier = getAccessTier(course.level);
      if (tier === "free") continue;

      // Idempotency: don't double-insert a payment for the same
      // (user, course) pair.
      const existing = await db
        .select({ id: PaymentsTable.id })
        .from(PaymentsTable)
        .where(
          and(
            eq(PaymentsTable.userId, userId),
            eq(PaymentsTable.courseId, courseId),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        skippedExisting++;
        continue;
      }

      // Date the payment slightly after enrolment so the natural
      // ordering on the user-detail timeline reads "paid → enrolled".
      // If enrollDate is missing, fall back to a random day in the
      // last 60 to keep the chart busy.
      const enrollMs =
        enrol.enrollDate?.getTime?.() ??
        Date.now() - Math.floor(rand() * 60) * 86_400_000;
      // Pay within 0–3 minutes of the enrolment so they group on
      // the same day on the chart.
      const createdAt = new Date(enrollMs + Math.floor(rand() * 180_000));

      if (tier === "star") {
        const cost = effectiveUnlockCost(
          course.level,
          course.unlockCost,
          chapterCounts.get(courseId) ?? 0,
        );
        await db.insert(PaymentsTable).values({
          userId,
          courseId,
          method: "stars",
          amountVnd: null,
          starsSpent: cost,
          status: "succeeded",
          createdAt,
        });
        starUnlocks++;
      } else {
        const price = effectivePriceVnd(
          course.level,
          course.priceVnd,
          course.courseId,
        );
        await db.insert(PaymentsTable).values({
          userId,
          courseId,
          method: pick(PAID_METHODS),
          amountVnd: price,
          starsSpent: null,
          status: "succeeded",
          createdAt,
        });
        paidPurchases++;
      }
    }
  }

  // Summary numbers for the operator — and a quick total revenue
  // figure so the chart's lifetime tile is easy to sanity-check.
  const [totalsRow] = await db
    .select({
      lifetime: sql<number>`COALESCE(SUM(${PaymentsTable.amountVnd}), 0)::bigint`,
      txns: sql<number>`COUNT(*)::int`,
    })
    .from(PaymentsTable)
    .where(eq(PaymentsTable.status, "succeeded"));

  console.log("---");
  console.log(`Star unlocks inserted:     ${starUnlocks}`);
  console.log(`Paid purchases inserted:   ${paidPurchases}`);
  console.log(`Skipped (already paid):    ${skippedExisting}`);
  console.log(
    `Lifetime revenue total:    ${Number(totalsRow.lifetime).toLocaleString("vi-VN")}₫ across ${totalsRow.txns} succeeded payments`,
  );
  console.log(
    "\nRe-run any time — script is idempotent on (userId, courseId).",
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
