import { NextRequest, NextResponse } from "next/server";
import { desc, asc } from "drizzle-orm";
import { db } from "@/config/db";
import { usersTable } from "@/config/schema";
import { auth } from "@/auth";

const LEADERBOARD_LIMIT = 100;

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
      points: usersTable.points,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.points), asc(usersTable.id))
    .limit(LEADERBOARD_LIMIT);

  return NextResponse.json({
    leaders: rows,
    currentUserEmail: session.user.email ?? null,
  });
}
