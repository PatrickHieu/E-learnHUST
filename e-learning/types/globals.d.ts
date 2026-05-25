export {};

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: "admin" | "librarian" | "instructor" | "student";
    };
  }
}
