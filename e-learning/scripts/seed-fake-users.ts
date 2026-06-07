import "dotenv/config";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../config/db";
import {
  CompletedLessonTable,
  CoursesTable,
  EnrolledCourseTable,
  LessonsTable,
  usersTable,
} from "../config/schema";

// Seeds ~30 fake students with realistic Vietnamese + English names,
// enrols each one in 0–3 random existing courses, and marks a varying
// fraction of each course's lessons completed. The XP totals + activity
// dates are spread over the last 90 days so the analytics charts in
// Phase 5 have a believable shape to plot.
//
// Idempotent: matched by email. Re-running tops up missing rows without
// duplicating users or completions.
//
// Run:  npm run seed:fake-users

// ---------- deterministic RNG so re-running is reproducible ----------
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
const rand = mulberry32(0xC0DEB10C);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (lo: number, hi: number) =>
  Math.floor(rand() * (hi - lo + 1)) + lo;

// ---------- fake learner roster ----------
type FakeUser = { name: string; emailLocal: string };

const FAKE_USERS: FakeUser[] = [
  // Vietnamese names with full diacritics — exercises the cert font fix
  { name: "Nguyễn Văn An", emailLocal: "nguyen.van.an" },
  { name: "Trần Thị Hồng Nhung", emailLocal: "tran.hong.nhung" },
  { name: "Phạm Minh Khôi", emailLocal: "pham.minh.khoi" },
  { name: "Lê Thị Mai Anh", emailLocal: "le.mai.anh" },
  { name: "Đặng Tuấn Linh", emailLocal: "dang.tuan.linh" },
  { name: "Vũ Quang Huy", emailLocal: "vu.quang.huy" },
  { name: "Hoàng Bảo Trâm", emailLocal: "hoang.bao.tram" },
  { name: "Bùi Đức Thắng", emailLocal: "bui.duc.thang" },
  { name: "Đỗ Thị Kim Ngân", emailLocal: "do.kim.ngan" },
  { name: "Phan Hoàng Nam", emailLocal: "phan.hoang.nam" },
  { name: "Ngô Thị Phương Linh", emailLocal: "ngo.phuong.linh" },
  { name: "Trịnh Văn Hiếu", emailLocal: "trinh.van.hieu" },
  { name: "Lý Thị Thanh Hà", emailLocal: "ly.thanh.ha" },
  { name: "Mai Quốc Bảo", emailLocal: "mai.quoc.bao" },
  { name: "Dương Hồng Phúc", emailLocal: "duong.hong.phuc" },
  { name: "Cao Thị Diệu Linh", emailLocal: "cao.dieu.linh" },
  { name: "Tô Văn Khang", emailLocal: "to.van.khang" },
  { name: "Hồ Thị Yến Nhi", emailLocal: "ho.yen.nhi" },

  // English names — international audience
  { name: "Alex Carter", emailLocal: "alex.carter" },
  { name: "Maya Patel", emailLocal: "maya.patel" },
  { name: "Jordan Lee", emailLocal: "jordan.lee" },
  { name: "Riley Nguyen", emailLocal: "riley.nguyen" },
  { name: "Sam O'Brien", emailLocal: "sam.obrien" },
  { name: "Priya Sharma", emailLocal: "priya.sharma" },
  { name: "Diego Hernández", emailLocal: "diego.hernandez" },
  { name: "Olivia Tanaka", emailLocal: "olivia.tanaka" },
  { name: "Kai Müller", emailLocal: "kai.muller" },
  { name: "Aisha Khan", emailLocal: "aisha.khan" },
  { name: "Ethan Park", emailLocal: "ethan.park" },
  { name: "Zoe Williams", emailLocal: "zoe.williams" },
];

// Marker so it's obvious in the DB which rows came from the fake seed.
// All emails use this domain so the admin can grep / filter on it, and
// userId columns get this prefix instead of a Clerk `user_xxx` ID.
const SEED_DOMAIN = "seed.codeblock.local";
const SEED_USER_PREFIX = "seed_";

const fakeUserId = (emailLocal: string) => `${SEED_USER_PREFIX}${emailLocal}`;
const fakeEmail = (emailLocal: string) => `${emailLocal}@${SEED_DOMAIN}`;

// ---------- per-user activity profile ----------
type Profile = {
  // Up to this many courses; actual count is randomised below.
  maxCourses: number;
  // Fraction of lessons completed per course (varies per enrollment).
  completionBuckets: readonly number[];
};
const PROFILES: readonly Profile[] = [
  // "Power learner" — enrolls in everything, finishes most
  { maxCourses: 3, completionBuckets: [1, 1, 0.85] },
  // "Steady" — enrolls in a couple, half-through
  { maxCourses: 2, completionBuckets: [0.5, 0.7] },
  // "Dabbler" — one course, just started
  { maxCourses: 1, completionBuckets: [0.15] },
  // "Lurker" — enrolled but never started
  { maxCourses: 1, completionBuckets: [0] },
  // "Just finished one" — single course, fully done
  { maxCourses: 1, completionBuckets: [1] },
] as const;

// Spread enrollment dates over the last N days so DAU/MAU charts have
// shape. Completion dates land between enrollment and now.
const DAYS_BACK = 90;
const dayAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

async function main() {
  console.log(`Seeding ${FAKE_USERS.length} fake users…`);

  // 1) Pull the full course/lesson catalogue once.
  const courses = await db.select().from(CoursesTable);
  if (courses.length === 0) {
    console.warn(
      "No courses found in DB — fake users will be created with no enrollments.",
    );
  }
  const lessons = await db.select().from(LessonsTable);
  const lessonsByCourse = new Map<number, typeof lessons>();
  for (const lesson of lessons) {
    const arr = lessonsByCourse.get(lesson.courseId) ?? [];
    arr.push(lesson);
    lessonsByCourse.set(lesson.courseId, arr);
  }

  let created = 0;
  let alreadyHad = 0;
  let enrolmentsAdded = 0;
  let completionsAdded = 0;

  for (const fake of FAKE_USERS) {
    const email = fakeEmail(fake.emailLocal);
    const userId = fakeUserId(fake.emailLocal);

    // 2) Upsert the user row, matched by email (unique).
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(usersTable).values({
        name: fake.name,
        email,
        points: 0,
        subscription: null,
      });
      created++;
    } else {
      alreadyHad++;
    }

    // 3) Decide which courses to enrol in.
    if (courses.length === 0) continue;
    const profile = pick(PROFILES);
    const courseCount = Math.min(
      profile.maxCourses,
      courses.length,
      between(0, profile.maxCourses),
    );
    if (courseCount === 0) continue;

    // Deterministic shuffle so re-running the seed produces the same picks.
    const shuffled = [...courses].sort(() => rand() - 0.5);
    const chosen = shuffled.slice(0, courseCount);

    let userXp = 0;

    for (let i = 0; i < chosen.length; i++) {
      const course = chosen[i];
      const courseId = course.courseId;
      const enrollAt = dayAgo(between(0, DAYS_BACK));

      // 4) Idempotent enrollment.
      const enrolled = await db
        .select()
        .from(EnrolledCourseTable)
        .where(
          and(
            eq(EnrolledCourseTable.userId, userId),
            eq(EnrolledCourseTable.courseId, courseId),
          ),
        )
        .limit(1);

      if (enrolled.length === 0) {
        await db.insert(EnrolledCourseTable).values({
          userId,
          courseId,
          enrollDate: enrollAt,
          xpEarned: 0,
        });
        enrolmentsAdded++;
      }

      // 5) Walk this course's lessons and mark the bucket fraction done.
      const courseLessons = (lessonsByCourse.get(courseId) ?? []).slice();
      if (courseLessons.length === 0) continue;
      courseLessons.sort(
        (a, b) =>
          a.chapterId - b.chapterId || a.orderIndex - b.orderIndex,
      );

      const bucket = profile.completionBuckets[i] ?? 0;
      const finishCount = Math.floor(courseLessons.length * bucket);
      let courseXp = 0;

      for (let k = 0; k < finishCount; k++) {
        const lesson = courseLessons[k];
        const alreadyDone = await db
          .select({ id: CompletedLessonTable.id })
          .from(CompletedLessonTable)
          .where(
            and(
              eq(CompletedLessonTable.userId, userId),
              eq(CompletedLessonTable.lessonId, lesson.id),
            ),
          )
          .limit(1);
        if (alreadyDone.length > 0) {
          courseXp += lesson.xp ?? 0;
          continue;
        }

        // Completion timestamp between enrolment and now.
        const daysSinceEnroll = Math.max(
          1,
          Math.floor((Date.now() - enrollAt.getTime()) / 86400000),
        );
        const completedAt = new Date(
          enrollAt.getTime() + between(0, daysSinceEnroll) * 86400000,
        );

        await db.insert(CompletedLessonTable).values({
          userId,
          courseId,
          chapterId: lesson.chapterId,
          lessonId: lesson.id,
          completedAt,
        });
        completionsAdded++;
        courseXp += lesson.xp ?? 0;
      }

      // Roll the course's XP up onto the enrollment row.
      if (courseXp > 0) {
        await db
          .update(EnrolledCourseTable)
          .set({ xpEarned: courseXp })
          .where(
            and(
              eq(EnrolledCourseTable.userId, userId),
              eq(EnrolledCourseTable.courseId, courseId),
            ),
          );
      }
      userXp += courseXp;
    }

    // 6) Update the user's running point total.
    if (userXp > 0) {
      await db
        .update(usersTable)
        .set({ points: sql`${userXp}` })
        .where(eq(usersTable.email, email));
    }
  }

  console.log("---");
  console.log(`Users created:    ${created}`);
  console.log(`Users existed:    ${alreadyHad}`);
  console.log(`Enrolments added: ${enrolmentsAdded}`);
  console.log(`Completions added: ${completionsAdded}`);
  console.log(
    `\nAll seed users use the domain @${SEED_DOMAIN} and userId prefix '${SEED_USER_PREFIX}'.`,
  );
  console.log(
    "Re-run any time — script is idempotent (matched on email + userId).",
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
