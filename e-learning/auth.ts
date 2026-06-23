import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
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
  //
  // Defense finding (f): the default 30-day session is too long for a
  // role-bearing token we can't revoke. Cap at 48h so a demoted admin
  // can never linger more than two days; UI uses fetch /api/user
  // before every sensitive admin action (see lib/sensitive-auth.ts)
  // to additionally re-read the latest role straight from the DB.
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 48,      // 48 hours
    updateAge: 60 * 60 * 12,   // refresh sliding window every 12h
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    // Google OAuth — for project owners signing in with their own
    // Gmail. AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET come from a Google
    // Cloud Console OAuth 2.0 client; redirect URI must be
    // {origin}/api/auth/callback/google. If the env vars are unset
    // the provider just doesn't render, which is fine for local
    // tinkering without a Google project.
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Promote profile info onto the user object so the signIn
      // callback can match by a normalised email regardless of casing.
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
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
    // Google sign-in lands with the provider's user.id (Google's sub
    // claim) and no role. Map it onto our usersTable: find by email or
    // create a fresh row, then rewrite user.id + user.role so the rest
    // of the system sees the same shape as a Credentials sign-in.
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      const [existing] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      if (existing) {
        user.id = String(existing.id);
        (user as { role?: string }).role = existing.role;
        return true;
      }

      // First Google sign-in for this email → create a row. The
      // passwordHash stays null so they can only sign back in with
      // Google going forward (or run bootstrap-admin to set one).
      const [created] = await db
        .insert(usersTable)
        .values({
          name: user.name ?? email.split("@")[0],
          email,
          role: "student",
          points: 0,
        })
        .returning();
      user.id = String(created.id);
      (user as { role?: string }).role = created.role;
      return true;
    },

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
