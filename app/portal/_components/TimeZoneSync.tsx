'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jsonRequest } from './useErrorMessage';

/**
 * Tells the server the browser's time zone when it differs from the one the
 * page was formatted in (first visit, or travelling), then re-renders, so
 * meeting times, messages and emails show the client's own clock.
 */
export default function TimeZoneSync({ current }: { current: string }) {
  const router = useRouter();

  useEffect(() => {
    let zone: string | undefined;
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!zone || zone === current) return;
    fetch('/api/portal/timezone', jsonRequest('POST', { timeZone: zone }))
      .then((response) => {
        if (response.ok) router.refresh();
      })
      .catch(() => {});
  }, [current, router]);

  return null;
}
