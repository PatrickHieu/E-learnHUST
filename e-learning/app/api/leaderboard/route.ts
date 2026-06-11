import { NextRequest, NextResponse } from "next/server";
import { desc, asc } from "drizzle-orm";
import { db } from "@/config/db";
import { usersTable } from "@/config/schema";
import { auth } from "@/auth";

const LEADERBOARD_LIMIT = 100;

// Leaderboard ranks by lifetimePoints (total stars ever earned, never
// decremented) instead of the spendable `points` balance. This way a
// learner who spends 200 ⭐ to unlock a course doesn't suddenly drop in
// the rankings — their position reflects accumulated achievement, not
// what's left in their wallet.
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      // Surfaces as `points` on the wire so the existing client doesn't
      // need a shape change — value is the lifetime total.
      points: usersTable.lifetimePoints,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.lifetimePoints), asc(usersTable.id))
    .limit(LEADERBOARD_LIMIT);

  return NextResponse.json({
    leaders: rows,
    currentUserEmail: session.user.email ?? null,
  });
}
