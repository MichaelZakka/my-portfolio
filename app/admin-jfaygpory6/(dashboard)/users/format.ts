import { getPortalTimeZone } from '../../../lib/portal/format';

/** Calendar date in the portal's time zone (timestamps, unlike date-only fields, are not UTC midnight). */
export function formatDay(date: Date): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: getPortalTimeZone() }).format(date);
}

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['minute', 60],
  ['hour', 24],
  ['day', 30],
  ['month', 12],
  ['year', Infinity],
];

/** "3 days ago", for how long since someone was last seen. */
export function timeAgo(date: Date, now = new Date()): string {
  let value = (date.getTime() - now.getTime()) / 60_000;
  if (Math.abs(value) < 1) return 'just now';
  for (const [unit, size] of STEPS) {
    if (Math.abs(value) < size) return RELATIVE.format(Math.round(value), unit);
    value /= size;
  }
  return formatDay(date);
}

export const LANGUAGE_LABELS: Record<string, string> = { en: 'English', ar: 'Arabic' };
