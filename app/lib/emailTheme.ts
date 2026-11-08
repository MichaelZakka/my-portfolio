/**
 * Shared look of the inbox notification emails (contact form, project brief).
 * Email clients ignore <style> blocks and modern CSS, so templates use table
 * layout with inline styles only, in the site's navy + signal blue palette.
 */

export const FONT = "'Segoe UI',Helvetica,Arial,sans-serif";
export const MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

export const C = {
  page: '#07122a',
  card: '#0f1f38',
  cardInner: '#13284a',
  border: '#22385c',
  text: '#ffffff',
  muted: '#a9b4c6',
  dim: '#7d8ba3',
  accent: '#1a73ff',
  accentText: '#5c9dff',
  button: '#1668e8',
};

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}

/** "8 Nov 2026, 14:05 (Damascus)" — the inbox owner's local time. */
export function formatReceived(date: Date): string {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Damascus',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return `${formatted} (Damascus)`;
}

/** Arabic text reads right to left; everything else left to right. */
export function textDir(value: string): 'rtl' | 'ltr' {
  return /[؀-ۿ]/.test(value) ? 'rtl' : 'ltr';
}
