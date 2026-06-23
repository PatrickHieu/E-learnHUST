import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../config/db";
import { usersTable } from "../config/schema";

// One-time migration: defense finding (e) renamed the 'librarian'
// role to 'instructor'. Existing DB rows still carry the old label,
// so this script flips them. Idempotent — re-running after a clean
// DB does nothing.
//
// Run once on each environment after pulling fix/defense-findings
// and before letting any instructor sign in:
//   npm run migrate:role-rename

async function main() {
  const rows = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.role, "librarian"));

  if (rows.length === 0) {
    console.log("No 'librarian' rows found — nothing to migrate.");
    return;
  }

  await db
    .update(usersTable)
    .set({ role: "instructor" })
    .where(eq(usersTable.role, "librarian"));

  console.log(`Migrated ${rows.length} user(s) from 'librarian' → 'instructor':`);
  for (const r of rows) console.log(`  ${r.email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
