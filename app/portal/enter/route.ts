import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isPortalLocale } from '../../lib/portal/constants';
import { PORTAL_LOCALE_COOKIE, localeCookieOptions } from '../../lib/portal/locale';

/**
 * Target of the site footer's "Client login" link. The portal takes its language
 * from a cookie rather than the URL, so this carries the site's language over.
 * Only when no language is set yet: sign-in saves the cookie's language to the
 * account (it also picks their emails' language), so a visit to the other
 * language's site must not change it.
 */
export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get('lang');
  const response = NextResponse.redirect(new URL('/portal/login', request.url));

  const hasLanguage = (await cookies()).has(PORTAL_LOCALE_COOKIE);
  if (!hasLanguage && isPortalLocale(lang)) {
    response.cookies.set(PORTAL_LOCALE_COOKIE, lang, localeCookieOptions());
  }
  return response;
}
