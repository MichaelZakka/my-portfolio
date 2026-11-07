import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { rateLimit } from '../../../../lib/rateLimit';
import { rateLimited, rejectCrossOrigin, unauthorized } from '../../../../lib/portal/http';
import { getPortalUser, setPortalSessionCookie } from '../../../../lib/portal/session';

/** "Sign out on all other devices": every other session ends; this browser gets a fresh cookie. */
export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const user = await getPortalUser();
  if (!user) return unauthorized();
  if (!rateLimit(`portal-sessions:${user.id}`, { limit: 5, windowMs: 15 * 60 * 1000 }).success) {
    return rateLimited();
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { sessionVersion: { increment: 1 } },
    select: { id: true, sessionVersion: true },
  });
  const response = NextResponse.json({ success: true });
  await setPortalSessionCookie(response, updated);
  return response;
}
