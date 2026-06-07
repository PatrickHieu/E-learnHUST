import { auth } from "@/auth";

export type AppRole = "admin" | "librarian" | "instructor" | "student";

// Reads the role off the current Auth.js session. With the JWT
// session strategy this never hits the DB — the role rides on the
// token cookie itself, set on sign-in.
export async function checkRole(role: AppRole): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === role;
}

// True for admin OR librarian — the two roles allowed into the admin
// content management surface (course / chapter / lesson CRUD). The
// Users page still gates separately on checkRole("admin").
export async function hasAdminAccess(): Promise<boolean> {
  const session = await auth();
  const role = session?.user?.role;
  return role === "admin" || role === "librarian";
}
