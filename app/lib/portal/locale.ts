import { cookies, headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { isPortalLocale, type PortalLocale } from './constants';

/**
 * The portal lives outside app/[locale], so its language comes from a cookie
 * (set by the language switch and at sign-in from User.locale) instead of the
 * URL. First visit falls back to the browser's primary language.
 */
export const PORTAL_LOCALE_COOKIE = 'portal_locale';
export const PORTAL_LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function getPortalLocale(): Promise<PortalLocale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(PORTAL_LOCALE_COOKIE)?.value;
  if (isPortalLocale(fromCookie)) return fromCookie;

  const headerStore = await headers();
  const primary = headerStore.get('accept-language')?.split(',')[0]?.trim().toLowerCase() ?? '';
  return primary.startsWith('ar') ? 'ar' : 'en';
}

/** Server-side translator for portal pages, bound to the portal locale. */
export async function getPortalTranslations(namespace = 'portal') {
  const locale = await getPortalLocale();
  const t = await getTranslations({ locale, namespace });
  return { t, locale };
}

export function localeCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: PORTAL_LOCALE_COOKIE_MAX_AGE,
  };
}
