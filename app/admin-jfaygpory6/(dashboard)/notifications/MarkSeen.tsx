'use client';

import { useEffect } from 'react';

/**
 * Opening the notifications screen marks everything shown as seen, then hands
 * the fresh badge numbers to the sidebar (the 'admin-badges' event) so the
 * bell clears without waiting for the next poll.
 */
export default function MarkSeen() {
  useEffect(() => {
    let stopped = false;
    void (async () => {
      try {
        const response = await fetch('/api/admin/notices/seen', { method: 'POST' });
        if (response.ok && !stopped) {
          window.dispatchEvent(new CustomEvent('admin-badges', { detail: await response.json() }));
        }
      } catch {
        // Offline: the badges clear on the next successful poll instead.
      }
    })();
    return () => {
      stopped = true;
    };
  }, []);
  return null;
}
