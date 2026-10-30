import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { parseJsonBody, rejectCrossOrigin } from '../../../lib/portal/http';
import { PORTAL_LOCALE_COOKIE, localeCookieOptions } from '../../../lib/portal/locale';
import { getPortalUser } from '../../../lib/portal/session';
import { localeBodySchema } from '../../../lib/portal/validation';

/** Language switch: sets the portal cookie and, when signed in, the language used for their emails. */
export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const body = await parseJsonBody(request, localeBodySchema);
  if (!body.ok) return body.response;
  const { locale } = body.data;

  const user = await getPortalUser();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { locale } });

  const response = NextResponse.json({ success: true, locale });
  response.cookies.set(PORTAL_LOCALE_COOKIE, locale, localeCookieOptions());
  return response;
}
