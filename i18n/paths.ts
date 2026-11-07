import { routing, type Locale } from './routing';

/** Locale-prefixed path: "/" + en -> "/", "/projects/x" + ar -> "/ar/projects/x". */
export function localizedPath(locale: string, path: string): string {
  if (locale === routing.defaultLocale) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

export const OG_LOCALE: Record<Locale, string> = { en: 'en_US', ar: 'ar_AR' };
