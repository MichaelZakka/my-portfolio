import type { PortalLocale } from './constants';

/**
 * Server-side formatting for the portal. Everything is formatted on the server
 * in a fixed time zone, so client components receive plain strings and there
 * is no hydration mismatch between server and browser clocks.
 */

/** Same Intl locales as the blog (app/lib/blog.ts). */
const INTL_LOCALE: Record<PortalLocale, string> = { en: 'en-US', ar: 'ar-SY' };

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

export function formatDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
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
    unitDisplay: 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
}

/** Value for <input type="date">. */
export function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : '';
}
