"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { usersTable } from "@/config/schema";
import { checkRole } from "@/lib/checkRole";

// Promote / demote between Librarian and Student by writing to
// usersTable.role. Admin-only — only an admin can grant the
// librarian role (Phase 2 spec). Accepts the numeric users.id as a
// string so the form field carries the same value the URL uses.
export async function setUserRoleAction(
  userId: string,
  role: "librarian" | "student",
) {
  if (!(await checkRole("admin"))) {
    throw new Error("Forbidden: admin only");
  }

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
