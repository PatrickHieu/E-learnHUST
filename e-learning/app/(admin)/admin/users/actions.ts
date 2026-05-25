"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { checkRole } from "@/lib/checkRole";

// Promote / demote between Librarian and Student. Admin-only — only an
// admin can grant the librarian role (Phase 2 spec).
export async function setUserRoleAction(
  clerkUserId: string,
  role: "librarian" | "student",
) {
  if (!(await checkRole("admin"))) {
    throw new Error("Forbidden: admin only");
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { role },
  });

  revalidatePath("/admin/users");
}
