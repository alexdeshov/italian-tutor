// Verified against @supabase/ssr v0.10 pattern:
// - updateSession handles cookie refresh and returns supabaseResponse
// - Redirect for unauthenticated users is safe: if getUser() refreshed a
//   token, the user would be non-null and we'd return supabaseResponse, not
//   the redirect. So no refreshed cookies are ever lost in the redirect path.
// - All server components create their own client per-request via createClient()
//   (each call to cookies() gets the fresh per-request store).

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const { pathname } = request.nextUrl

  // (auth) routes and auth callback are always public
  const isPublic =
    pathname.startsWith('/login') || pathname.startsWith('/auth/')

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
