import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/auth', '/api/health']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/generated') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  // Check JWT token (edge-compatible, no Node.js deps)
  // Behind reverse proxies (Railway, Vercel), the app receives HTTP requests
  // internally but cookies are set with __Secure- prefix (HTTPS). We must
  // explicitly tell getToken the request is secure so it looks for the right
  // cookie name (__Secure-authjs.session-token).
  const isSecure =
    req.headers.get('x-forwarded-proto') === 'https' ||
    req.nextUrl.protocol === 'https:' ||
    process.env.NODE_ENV === 'production'

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: isSecure,
  })
  const isLoggedIn = !!token

  // Redirect unauthenticated users to login
  if (!isLoggedIn) {
    // For API routes, return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', meta: { timestamp: new Date().toISOString() } },
        { status: 401 }
      )
    }

    // For pages, redirect to login
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
