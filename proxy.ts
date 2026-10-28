import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { ADMIN_SESSION_COOKIE, verifySessionToken } from './app/lib/auth';
import { routing } from './i18n/routing';

const intl = createIntlMiddleware(routing);

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/api/admin/login']);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public pages: locale routing (/ = English, /ar = Arabic)
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return intl(request);
  }
  return adminGuard(request, pathname);
}

async function adminGuard(request: NextRequest, pathname: string) {
  // Fail closed: if auth env is missing, never expose the dashboard.
  const authConfigured = Boolean(
    process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH && process.env.AUTH_SECRET
  );

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (!authConfigured) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Admin routes, plus every page except API routes, Next internals and static files
  matcher: ['/admin/:path*', '/api/admin/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
