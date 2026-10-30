import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import {
  ADMIN_SESSION_COOKIE,
  PORTAL_SESSION_COOKIE,
  verifyPortalSessionToken,
  verifySessionToken,
} from './app/lib/auth';
import { routing } from './i18n/routing';

const intl = createIntlMiddleware(routing);

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/api/admin/login']);

// Client portal pages and APIs that must work without a session.
const PUBLIC_PORTAL_PATHS = new Set([
  '/portal/login',
  '/portal/forgot-password',
  '/api/portal/auth/login',
  '/api/portal/auth/logout',
  '/api/portal/auth/forgot-password',
  '/api/portal/auth/reset-password',
  '/api/portal/invitations/accept',
  '/api/portal/locale',
]);
const PUBLIC_PORTAL_PREFIXES = ['/portal/invite/', '/portal/reset-password/'];

const isWithin = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isWithin(pathname, '/portal') || isWithin(pathname, '/api/portal')) {
    return portalGuard(request, pathname);
  }

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

/**
 * First line of defence for /portal: a genuine, unexpired client session
 * cookie. Membership of the requested project is checked again on the server
 * by every page and API route (app/lib/portal/access.ts).
 */
async function portalGuard(request: NextRequest, pathname: string) {
  if (
    PUBLIC_PORTAL_PATHS.has(pathname) ||
    PUBLIC_PORTAL_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next();
  }

  // Fail closed: without AUTH_SECRET no session can be verified.
  const session = process.env.AUTH_SECRET
    ? await verifyPortalSessionToken(request.cookies.get(PORTAL_SESSION_COOKIE)?.value)
    : null;

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/portal/login', request.url);
    if (pathname !== '/portal') loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Admin and portal routes, plus every page except API routes, Next internals and static files
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/portal/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
