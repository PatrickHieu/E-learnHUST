import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../config/db";
import { usersTable } from "../config/schema";

// One-shot creator for the three role test accounts (admin /
// instructor / student). Idempotent: if any email already exists,
// the row's password is reset and the role is enforced — so
// re-running after a manual change always restores known-good
// credentials for QA.
//
// Run:  npm run bootstrap:test-accounts

type TestAccount = {
  name: string;
  email: string;
  role: "admin" | "instructor" | "student";
};

const SHARED_PASSWORD = "Password1!";

const ACCOUNTS: TestAccount[] = [
  { name: "Admin Tester",      email: "admin@codeblock.test",      role: "admin" },
  { name: "Instructor Tester", email: "instructor@codeblock.test", role: "instructor" },
  { name: "Student Tester",    email: "student@codeblock.test",    role: "student" },
];

async function main() {
  console.log("Bootstrapping test accounts…\n");
  const passwordHash = await bcrypt.hash(SHARED_PASSWORD, 10);

  let created = 0;
  let updated = 0;

  for (const acc of ACCOUNTS) {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, acc.email))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(usersTable)
        .set({ passwordHash, role: acc.role, name: acc.name })
        .where(eq(usersTable.email, acc.email));
      updated++;
      console.log(`  ↻ ${acc.role.padEnd(10)} ${acc.email}  (updated)`);
    } else {
      await db.insert(usersTable).values({
        name: acc.name,
        email: acc.email,
        passwordHash,
        role: acc.role,
        points: 0,
      });
      created++;
      console.log(`  + ${acc.role.padEnd(10)} ${acc.email}  (created)`);
    }
  }

  console.log("\n---");
  console.log(`Created: ${created}   Updated: ${updated}`);
  console.log("\nUse the same password for all three:");
  console.log(`  ${SHARED_PASSWORD}\n`);
  console.log("Sign in at /sign-in. Re-run any time to reset passwords.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
