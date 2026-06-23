import { auth } from "@/auth";

// Defense finding (e): collapsed the role enum to a single canonical
// label per access tier. The report's "Giảng viên / instructor" wins
// — `librarian` is gone from the code, the UI, the report, and the
// seed scripts. Existing DB rows with role='librarian' are migrated
// to 'instructor' by scripts/migrate-librarian-to-instructor.ts.
export type AppRole = "admin" | "instructor" | "student";

// Reads the role off the current Auth.js session. With the JWT
// session strategy this never hits the DB — the role rides on the
// token cookie itself, set on sign-in.
export async function checkRole(role: AppRole): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === role;
}

// True for admin OR instructor — the two roles allowed into the admin
// content management surface (course / chapter / lesson CRUD). The
// Users page still gates separately on checkRole("admin").
export async function hasAdminAccess(): Promise<boolean> {
  const session = await auth();
  const role = session?.user?.role;
  return role === "admin" || role === "instructor";
}
