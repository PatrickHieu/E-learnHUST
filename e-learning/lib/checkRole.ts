import { auth } from "@clerk/nextjs/server";

export const checkRole = async (role: "admin" | "instructor" | "student") => {
  const { sessionClaims } = await auth();
  return sessionClaims?.metadata.role === role;
};
