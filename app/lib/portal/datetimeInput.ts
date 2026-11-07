/**
 * <input type="datetime-local"> works in the browser's time zone and has no
 * offset, so meeting times are converted to an ISO instant before they are
 * sent. Client-safe: no server imports.
 */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** The browser-local "YYYY-MM-DDTHH:mm" for an ISO instant (prefills a reschedule form). */
export function isoToLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
