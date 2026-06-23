"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { usersTable } from "@/config/schema";
import { requireFreshRole } from "@/lib/sensitive-auth";

// Promote / demote between Instructor and Student by writing to
// usersTable.role. Admin-only — only an admin can grant the
// instructor role (Phase 2 spec). Accepts the numeric users.id as a
// string so the form field carries the same value the URL uses.
//
// Defense finding (f): role grants re-read the caller's role from
// the DB (not the JWT) so a freshly demoted admin can't keep handing
// out instructor rights with a stale token.
export async function setUserRoleAction(
  userId: string,
  role: "instructor" | "student",
) {
  await requireFreshRole("admin");

  const numericId = Number(userId);
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid user id");
  }

  await db
    .update(usersTable)
    .set({ role })
    .where(eq(usersTable.id, numericId));

  revalidatePath("/admin/users");
}
