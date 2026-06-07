import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { usersTable } from "@/config/schema";

// Next-Auth's TypeScript shape — augment so the session carries our
// own user.id (string of the numeric users.id) and user.role fields.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
  interface User {
    role?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT strategy keeps everything stateless — no sessions table needed
  // in Postgres, no second round-trip per request. The user's id +
  // role land on the token via the callbacks below.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.email, email))
          .limit(1);

        // No row, or row predates Auth.js migration → no hash → can't
        // authenticate. Treat both as a generic "wrong email/password"
        // so we don't leak which one missed.
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // user is only populated on initial sign-in. Pin id + role onto
      // the token so subsequent requests don't need a DB hit.
      if (user) {
        (token as { id?: string }).id = user.id as string;
        (token as { role?: string }).role =
          (user as { role?: string }).role ?? "student";
      }
      return token;
    },
    async session({ session, token }) {
      const id = (token as { id?: string }).id;
      const role = (token as { role?: string }).role;
      if (id) session.user.id = id;
      if (role) session.user.role = role;
      return session;
    },
  },
});
