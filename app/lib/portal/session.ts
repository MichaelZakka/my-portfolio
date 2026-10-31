import { cache } from 'react';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import {
  PORTAL_SESSION_COOKIE,
  PORTAL_SESSION_TTL_SECONDS,
  createPortalSessionToken,
  verifyPortalSessionToken,
} from '../auth';
import { prisma } from '../db';

export type PortalUser = {
  id: string;
  email: string;
  name: string;
  locale: string;
};

/**
 * The signed-in client for this request, or null. Unlike the proxy gate this
 * hits the database, so a password reset (sessionVersion bump), a role change
 * or a deleted account invalidates existing cookies immediately.
 * Cached per request so layouts and pages can both call it.
 */
export const getPortalUser = cache(async (): Promise<PortalUser | null> => {
  const cookieStore = await cookies();
  const session = await verifyPortalSessionToken(cookieStore.get(PORTAL_SESSION_COOKIE)?.value);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      name: true,
      locale: true,
      role: true,
      passwordHash: true,
      sessionVersion: true,
    },
  });

  if (
    !user ||
    user.role !== 'client' ||
    !user.passwordHash ||
    user.sessionVersion !== session.ver
  ) {
    return null;
  }

  return { id: user.id, email: user.email, name: user.name, locale: user.locale };
});

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Lax (not Strict like admin) so links in notification emails land signed in;
    // mutations are still protected by SameSite plus the same-origin check.
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export async function setPortalSessionCookie(
  response: NextResponse,
  user: { id: string; sessionVersion: number }
) {
  const token = await createPortalSessionToken(user.id, user.sessionVersion);
  response.cookies.set(PORTAL_SESSION_COOKIE, token, sessionCookieOptions(PORTAL_SESSION_TTL_SECONDS));
}

export function clearPortalSessionCookie(response: NextResponse) {
  response.cookies.set(PORTAL_SESSION_COOKIE, '', sessionCookieOptions(0));
}

export function isPortalAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16);
}
