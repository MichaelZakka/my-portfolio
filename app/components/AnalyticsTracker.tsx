'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView } from '../lib/analyticsClient';

/** Mounted once in the root layout — fires a page_view beacon on every route change. */
export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;
    trackPageView(pathname ?? undefined);
  }, [pathname, searchParams]);

  return null;
}
