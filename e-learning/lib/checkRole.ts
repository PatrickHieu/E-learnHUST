import { auth } from "@clerk/nextjs/server";

export type AppRole = "admin" | "librarian" | "instructor" | "student";

export const checkRole = async (role: AppRole) => {
  const { sessionClaims } = await auth();
  return sessionClaims?.metadata?.role === role;
};

// True for admin OR librarian — the two roles allowed into the admin
// content management surface (course / chapter / lesson CRUD). The Users
// page still gates separately on checkRole("admin").
export const hasAdminAccess = async () => {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.metadata?.role;
  return role === "admin" || role === "librarian";
};
