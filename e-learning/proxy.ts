import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Auth.js middleware. Mirrors the original Clerk gates:
// - sign-in / sign-up / "/" are public
// - /admin/* requires admin or librarian role
// - /admin/users/* requires admin specifically
// - everything else needs a session
//
// JWT session means this runs without a DB call — the role lands on
// the cookie at sign-in time and is read straight off the token here.
const PUBLIC_PATHS = [/^\/sign-in/, /^\/sign-up/, /^\/$/];

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
    } else if (role !== "admin" && role !== "librarian") {
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
