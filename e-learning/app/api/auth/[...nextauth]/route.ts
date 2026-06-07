// NextAuth catch-all handler. Routes /api/auth/* to the Auth.js
// session, sign-in, callback, and CSRF endpoints.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
