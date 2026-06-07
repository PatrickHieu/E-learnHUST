import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../config/db";
import { usersTable } from "../config/schema";

// One-shot creator for the project owner's admin account, since Auth.js
// sign-up only ever yields a 'student' role. Reads email + password
// from env (or argv) so the password never has to live in the repo.
//
// Usage:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=Strong1! npm run bootstrap:admin
//
// Idempotent: if the email already exists, promotes it to admin and
// resets its password to whatever was provided. Safe to re-run after
// a password rotation.

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? process.argv[2] ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? process.argv[3] ?? "";
  const name = process.env.ADMIN_NAME ?? process.argv[4] ?? "Admin";

  if (!email || !email.includes("@")) {
    console.error("Missing ADMIN_EMAIL (or argv[2]) — must be a valid email.");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Missing ADMIN_PASSWORD (or argv[3]) — must be ≥6 chars.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(usersTable)
      .set({ passwordHash, role: "admin" })
      .where(eq(usersTable.email, email));
    console.log(`✓ Promoted ${email} to admin and reset password.`);
  } else {
    await db.insert(usersTable).values({
      name,
      email,
      passwordHash,
      role: "admin",
      points: 0,
    });
    console.log(`✓ Created new admin account: ${email}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
