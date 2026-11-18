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

/** The language the visitor picked with the switch (or restored at sign-in); null when never set. */
export async function getPortalLocaleCookie(): Promise<PortalLocale | null> {
  const fromCookie = (await cookies()).get(PORTAL_LOCALE_COOKIE)?.value;
  return isPortalLocale(fromCookie) ? fromCookie : null;
}

/**
 * The cookie, else `fallback` (what we already know about this person, e.g.
 * the language they chose on the request form), else the browser's language.
 */
export async function getPortalLocale(fallback?: string | null): Promise<PortalLocale> {
  const fromCookie = await getPortalLocaleCookie();
  if (fromCookie) return fromCookie;
  if (isPortalLocale(fallback)) return fallback;

  const headerStore = await headers();
  const primary = headerStore.get('accept-language')?.split(',')[0]?.trim().toLowerCase() ?? '';
  return primary.startsWith('ar') ? 'ar' : 'en';
}

/** Server-side translator for portal pages, bound to the portal locale. */
export async function getPortalTranslations(namespace = 'portal', fallback?: string | null) {
  const locale = await getPortalLocale(fallback);
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
