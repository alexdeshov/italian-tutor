// Verified against @supabase/ssr v0.10 pattern:
// - setAll writes to request.cookies (so subsequent getAll sees updated values)
//   AND to supabaseResponse.cookies (so refreshed tokens reach the browser)
// - getUser() immediately after createServerClient — no intervening logic
// - supabaseResponse (not a new NextResponse) is always returned to caller

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 1. Write to request so the updated cookies are readable in this
          //    same request cycle (e.g. by getUser after a token refresh).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          // 2. Recreate response with updated request so Set-Cookie headers
          //    are included and the browser receives the refreshed tokens.
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: nothing between createServerClient and getUser().
  // getUser() triggers token refresh when the access token has expired.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
