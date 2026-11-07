/**
 * Sends a crash caught by an error boundary to /api/errors. Errors with a
 * digest happened on the server and were reported there already
 * (instrumentation.ts), so only browser-side ones are sent. Best effort.
 */
export function reportBrowserError(error: Error & { digest?: string }) {
  if (error.digest) return;
  try {
    void fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: (error.message || error.name || 'Browser error').slice(0, 500),
        stack: error.stack?.slice(0, 4000),
        path: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting must never make things worse.
  }
}
