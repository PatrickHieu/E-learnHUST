import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { usersTable } from "@/config/schema";

// Custom sign-up endpoint. Auth.js Credentials provider only handles
// the sign-in half; user creation is on us. POSTs land here from the
// /sign-up page form, write a row with a bcrypt hash, and the client
// follows up with a signIn() call to start a session.
//
// Default role is 'student' — admin/instructor must be elevated via
// the existing /admin/users RoleToggleButton (now writing to
// usersTable.role instead of Clerk publicMetadata.role).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string; name?: string }
    | null;

  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  // 10 rounds is the bcrypt default — ~70ms per hash on commodity
  // hardware, fast enough for sign-up + tough enough to throttle a
  // dump-and-crack attack.
  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(usersTable).values({
    name,
    email,
    passwordHash,
    role: "student",
    points: 0,
  });

  return NextResponse.json({ success: true });
}
