import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/'
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])
// Sub-area of /admin reserved for the admin role only — user management,
// role assignment. Librarians are blocked here even though they have
// general /admin access.
const isAdminOnlyRoute = createRouteMatcher(['/admin/users(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }
  if (isAdminRoute(req)) {
    const { sessionClaims } = await auth();
    const role = sessionClaims?.metadata?.role;

    if (isAdminOnlyRoute(req)) {
      if (role !== 'admin') {
        const url = new URL('/', req.url);
        return NextResponse.redirect(url);
      }
    } else if (role !== 'admin' && role !== 'librarian') {
      const url = new URL('/', req.url);
      return NextResponse.redirect(url);
    }
  }
  await auth.protect();
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}