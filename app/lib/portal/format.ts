import type { PortalLocale } from './constants';

/**
 * Server-side formatting for the portal. Everything is formatted on the server
 * in a fixed time zone, so client components receive plain strings and there
 * is no hydration mismatch between server and browser clocks.
 */

/**
 * Levantine month names like the blog (app/lib/blog.ts), but Latin digits:
 * numbers inside translated sentences ("1 من 3") and the site's Arabic copy
 * use them, so dates and sizes match on the same page.
 */
const INTL_LOCALE: Record<PortalLocale, string> = { en: 'en-US', ar: 'ar-SY-u-nu-latn' };

export function getPortalTimeZone(): string {
  const zone = process.env.PORTAL_TIME_ZONE?.trim();
  if (!zone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return zone;
  } catch {
    return 'UTC';
  }
}

export function intlLocale(locale: string): string {
  return INTL_LOCALE[locale as PortalLocale] ?? INTL_LOCALE.en;
}

/** Date-only fields (due dates, estimated completion) are stored as UTC midnight. */
export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
}

/** Explicit fields: Intl rejects dateStyle/timeStyle combined with timeZoneName. */
export function formatDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: getPortalTimeZone(),
    timeZoneName: 'short',
  }).format(date);
}

export function formatBytes(bytes: number, locale: string): string {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'unit',
    unit: units[unit],
    // "74 bytes" (the short English form is the odd "74 byte"), "1.5 kB", "4 MB"
    unitDisplay: unit === 0 ? 'long' : 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
}

/** Value for <input type="date">. */
export function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : '';
}
