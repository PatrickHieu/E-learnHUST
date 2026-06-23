import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/config/db";
import { usersTable } from "@/config/schema";
import type { AppRole } from "./checkRole";

// Defense finding (f): JWT-based sessions can't be revoked. Until a
// session-store layer lands, every sensitive admin action re-reads
// the role straight from Postgres. So a demoted admin who still has
// a valid token in the browser hits a 403 the moment they try to
// change a role / write a course / unlock a paid course for free.
//
// Use this in: setUserRoleAction (role grants), any future payment
// reversal / refund route, anything that mutates another user's
// data. Routine reads (e.g. /admin/courses listing) can keep using
// the cheaper JWT-only checkRole() in lib/checkRole.ts.
export async function requireFreshRole(
  expected: AppRole,
): Promise<{ userId: number; email: string; role: string }> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    throw new Error("Forbidden: unauthenticated");
  }
  const [row] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (!row) {
    throw new Error("Forbidden: user row missing");
  }
  if (row.role !== expected) {
    throw new Error(
      `Forbidden: this action requires role '${expected}', current role is '${row.role}'`,
    );
  }
  return { userId: row.id, email: row.email, role: row.role };
}
