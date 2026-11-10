'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import styles from '../admin.module.css';
import ScreenSkeleton from './ScreenSkeleton';

/**
 * The dashboard's main area, with loading feedback for moving between screens.
 *
 * Every dashboard page renders on the server. Without feedback, a click on a
 * link looks like it did nothing until the whole response arrives. This
 * watches for client-side navigations started by <Link>. The sidebar
 * highlights the target at once, and if the screen takes more than a moment,
 * the main area swaps to that screen's shimmer skeleton until it arrives.
 * The sidebar stays usable throughout, and another click just retargets.
 *
 * Why not loading.tsx: a route loading boundary makes the page stream after
 * the shell, and on Next 16.1.1 router.refresh() then drops the update (the
 * request and Site screens rely on it after saving). Keep it this way until
 * an upgraded Next is re-tested.
 */

/** Wait this long before swapping to the skeleton, so fast loads go straight to the new screen. */
const REVEAL_DELAY_MS = 120;
/** Never leave a skeleton up if a navigation somehow doesn't complete. */
const GIVE_UP_MS = 20_000;

type Pending = { from: string; to: string; revealed: boolean };

// A tiny store rather than useState. While the router's navigation transition
// waits for the server, React renders it speculatively with the new pathname;
// store updates render synchronously on their own, so the skeleton commits
// while that transition is still pending.
let pending: Pending | null = null;
const listeners = new Set<() => void>();

function setPending(next: Pending | null) {
  if (next === pending) return;
  pending = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => pending;
const getServerSnapshot = () => null;

/** The pending navigation, if it started from the screen currently shown. */
function useActiveNavigation(): Pending | null {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const pathname = usePathname();
  // Once the new screen commits, pathname no longer matches and this goes quiet at once.
  return current !== null && current.from === pathname ? current : null;
}

/** The dashboard path a navigation is heading to while it loads, else null. */
export function useNavigationTarget(): string | null {
  return useActiveNavigation()?.to ?? null;
}

function isDashboardPath(pathname: string): boolean {
  return (pathname === '/admin' || pathname.startsWith('/admin/')) && !pathname.startsWith('/admin/login');
}

export default function AdminMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const navigation = useActiveNavigation();

  // A new screen committed (or back/forward moved on): forget the navigation.
  useEffect(() => {
    setPending(null);
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      // <Link> calls preventDefault only when it takes the click as a client-side
      // navigation (not for new-tab clicks, downloads or external links).
      // React's own listener sits on the document, so this window listener runs after it.
      if (!event.defaultPrevented || event.button !== 0) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin || !isDashboardPath(url.pathname)) return;
      const from = window.location.pathname;
      // Same screen (paging, filters): those lists show their own in-page skeleton.
      if (url.pathname === from) return;
      // Retargeting mid-load keeps the skeleton up instead of restarting the delay.
      setPending({ from, to: url.pathname, revealed: pending?.from === from && pending.revealed });
    }
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  const target = navigation?.to ?? null;
  const revealed = navigation?.revealed ?? false;

  useEffect(() => {
    if (target === null || revealed) return;
    const timer = setTimeout(() => {
      if (pending) setPending({ ...pending, revealed: true });
    }, REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [target, revealed]);

  useEffect(() => {
    if (target === null) return;
    const timer = setTimeout(() => setPending(null), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [target]);

  const loadingPath = revealed ? target : null;

  return (
    <main className={styles.main}>
      {/* The old screen stays mounted (hidden) until the new one replaces it */}
      <div hidden={loadingPath !== null}>{children}</div>
      {loadingPath !== null && <ScreenSkeleton path={loadingPath} />}
    </main>
  );
}
