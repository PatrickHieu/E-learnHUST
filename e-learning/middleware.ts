import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Auth.js middleware. Mirrors the original Clerk gates:
// - sign-in / sign-up / "/" are public
// - /api/auth/* MUST be public — that's where the credentials POST,
//   session refresh, CSRF, and sign-out endpoints live. Without this
//   the middleware redirects the sign-in form's own POST to /sign-in
//   (HTML), the fetch client gets HTML back instead of JSON, and
//   sign-in silently fails with no error in the browser.
// - /api/auth/register (custom sign-up endpoint) is reached by users
//   who aren't logged in yet, so it's public for the same reason.
// - /admin/* requires admin or instructor role
// - /admin/users/* requires admin specifically
// - everything else needs a session
//
// JWT session means this runs without a DB call — the role lands on
// the cookie at sign-in time and is read straight off the token here.
const PUBLIC_PATHS = [
  /^\/sign-in/,
  /^\/sign-up/,
  /^\/api\/auth\//,
  /^\/$/,
];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((re) => re.test(pathname));
  if (isPublic) return NextResponse.next();

  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (pathname.startsWith("/admin")) {
    const role = session.user.role;
    if (pathname.startsWith("/admin/users")) {
      if (role !== "admin") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    } else if (role !== "admin" && role !== "instructor") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files, but run on everything
    // else including API routes.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
