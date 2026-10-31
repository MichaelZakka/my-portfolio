import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../lib/db';
import { getClientIp, rateLimit } from '../../../../lib/rateLimit';
import { isPortalLocale } from '../../../../lib/portal/constants';
import { verifyPassword } from '../../../../lib/portal/credentials';
import { apiError, parseJsonBody, rateLimited, rejectCrossOrigin } from '../../../../lib/portal/http';
import { PORTAL_LOCALE_COOKIE, localeCookieOptions } from '../../../../lib/portal/locale';
import { isPortalAuthConfigured, setPortalSessionCookie } from '../../../../lib/portal/session';
import { loginSchema } from '../../../../lib/portal/validation';

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const ip = getClientIp(request);
  if (!rateLimit(`portal-login:${ip}`, { limit: 10, windowMs: 5 * 60 * 1000 }).success) {
    return rateLimited();
  }

  if (!isPortalAuthConfigured()) {
    return apiError(503, 'notConfigured', 'Portal sign-in is not configured. Set AUTH_SECRET.');
  }

  const body = await parseJsonBody(request, loginSchema);
  if (!body.ok) return body.response;
  const { email, password } = body.data;

  // Per-account limit too, so one address can't be brute-forced from many IPs.
  if (!rateLimit(`portal-login-email:${email}`, { limit: 10, windowMs: 15 * 60 * 1000 }).success) {
    return rateLimited();
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, passwordHash: true, sessionVersion: true, locale: true },
  });
  // Unknown emails still run bcrypt (against a dummy hash) so timing doesn't reveal accounts.
  const valid = await verifyPassword(password, user?.role === 'client' ? user.passwordHash : null);
  if (!user || user.role !== 'client' || !valid) {
    return apiError(401, 'invalidCredentials', 'Invalid email or password.');
  }

  // A language picked on the sign-in page wins; otherwise restore the saved one.
  const cookieLocale = (await cookies()).get(PORTAL_LOCALE_COOKIE)?.value;
  const locale = isPortalLocale(cookieLocale) ? cookieLocale : user.locale;
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), locale } });

  const response = NextResponse.json({ success: true });
  await setPortalSessionCookie(response, user);
  response.cookies.set(PORTAL_LOCALE_COOKIE, locale, localeCookieOptions());
  return response;
}
