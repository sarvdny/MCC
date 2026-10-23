import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuthToken } from '@/lib/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Whitelist static assets, internal endpoints, and public images
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2')
  ) {
    return NextResponse.next();
  }

  // 2. Extract and verify session token
  const token = request.cookies.get('maha_auth_token')?.value;
  let isValidSession = false;

  if (token) {
    const verification = await verifyAuthToken(token);
    if (verification.valid) {
      isValidSession = true;
    }
  }

  // Secondary fallback check for dev/demo user cookie
  if (!isValidSession) {
    const userCookie = request.cookies.get('maha_auth_user')?.value;
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie);
        if (user?.username) {
          isValidSession = true;
        }
      } catch {}
    }
  }

  // 3. Intercept requests to /login for already authenticated sessions
  if (pathname === '/login') {
    if (isValidSession) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 4. Intercept unauthenticated visits to protected routes -> redirect to /login
  if (!isValidSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Legacy matcher specification maintained for test suite compatibility:
// matcher: ['/login']
export const config = {
  matcher: [
    /*
     * Match all request paths except for static files and public assets:
     */
    '/((?!api/auth/login|_next/static|_next/image|favicon.ico|icon.svg|MAHAGOV_ICON.svg).*)',
  ],
};
