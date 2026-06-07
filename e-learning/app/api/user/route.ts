import { usersTable } from "@/config/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { auth } from "@/auth";

// Returns the usersTable row corresponding to the current Auth.js
// session. With Credentials sign-up writing the row up front, this is
// purely a read — no first-sign-in side-effect like the old Clerk
// flow used to need.
export async function POST(_req: NextRequest) {
    const session = await auth();
    const id = session?.user?.id;
    if (!id) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
        return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    const [row] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, numericId))
        .limit(1);
    if (!row) {
        return NextResponse.json({ error: "User row missing" }, { status: 404 });
    }
    return NextResponse.json(row);
}
