'use client';

import { useEffect, useRef, useState, type MouseEvent, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Inbox, FolderKanban, LineChart, Globe, LogOut, Menu, PenLine, X } from 'lucide-react';
import styles from '../admin.module.css';
import { useNavigationTarget } from './AdminMain';

const NAV_ITEMS = [
  { href: '/admin-jfaygpory6', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin-jfaygpory6/requests', label: 'Requests', icon: Inbox },
  { href: '/admin-jfaygpory6/projects', label: 'Projects', icon: FolderKanban },
  { href: '/admin-jfaygpory6/visitors', label: 'Analytics', icon: LineChart },
  { href: '/admin-jfaygpory6/content', label: 'Content', icon: PenLine },
  { href: '/admin-jfaygpory6/site', label: 'Site', icon: Globe },
] as const;

const DRAWER_ID = 'admin-nav-drawer';
/** Matches the CSS breakpoint above which the sidebar replaces the drawer. */
const WIDE_SCREEN = '(min-width: 901px)';

type Badges = { messages: number; problems: number };

/** Unread client messages and open problems, refreshed every minute (and on navigation). */
function useBadges(pathname: string | null): Badges {
  const [badges, setBadges] = useState<Badges>({ messages: 0, problems: 0 });
  useEffect(() => {
    let stopped = false;
    const load = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await fetch('/api/admin/unread', { cache: 'no-store' });
        if (response.ok && !stopped) setBadges((await response.json()) as Badges);
      } catch {
        // Offline: keep the last counts.
      }
    };
    void load();
    const timer = setInterval(load, 60_000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [pathname]);
  return badges;
}

/** Slides the drawer out, then closes the dialog (at once when motion is reduced). */
function closeDrawer(dialog: HTMLDialogElement | null) {
  if (!dialog?.open || dialog.hasAttribute('data-closing')) return;
  dialog.setAttribute('data-closing', '');
  if (getComputedStyle(dialog).animationName === 'none') {
    dialog.removeAttribute('data-closing');
    dialog.close();
    return;
  }
  const finish = (event: AnimationEvent) => {
    // The backdrop's fade reports here too; wait for the panel's own slide
    if (event.target !== dialog || event.pseudoElement) return;
    dialog.removeEventListener('animationend', finish);
    dialog.removeAttribute('data-closing');
    dialog.close();
  };
  dialog.addEventListener('animationend', finish);
}

/**
 * Wide screens: the fixed sidebar. Phones and tablets: a top bar whose menu
 * button opens the same navigation in a drawer from the side.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const badges = useBadges(pathname);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // While a screen loads, its link is already highlighted, so the click visibly registered
  const current = useNavigationTarget() ?? pathname;
  const isActive = (href: string, exact?: boolean) =>
    exact ? current === href : current === href || current?.startsWith(`${href}/`);

  const badgeFor = (href: string) =>
    href === '/admin-jfaygpory6/projects'
      ? { value: badges.messages, label: 'unread client messages' }
      : href === '/admin-jfaygpory6/site'
        ? { value: badges.problems, label: 'open problems' }
        : null;
  const needsAttention = badges.messages + badges.problems;

  // Back/forward (or any other route change) closes the drawer too
  useEffect(() => {
    closeDrawer(drawerRef.current);
  }, [pathname]);

  // Growing past the breakpoint (rotating a tablet) swaps the drawer for the sidebar
  useEffect(() => {
    const wide = window.matchMedia(WIDE_SCREEN);
    const onChange = () => {
      if (wide.matches) drawerRef.current?.close();
    };
    wide.addEventListener('change', onChange);
    return () => wide.removeEventListener('change', onChange);
  }, []);

  const openDrawer = () => {
    const dialog = drawerRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setDrawerOpen(true);
  };

  const onDrawerClick = (event: MouseEvent<HTMLDialogElement>) => {
    // The panel fills the dialog box, so only a click on the backdrop targets the dialog itself
    if (event.target === event.currentTarget) closeDrawer(event.currentTarget);
  };

  const onDrawerCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    // Escape: slide out instead of vanishing
    event.preventDefault();
    closeDrawer(event.currentTarget);
  };

  const closeFromLink = () => closeDrawer(drawerRef.current);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin-jfaygpory6/login');
    router.refresh();
  };

  const navigation = (inDrawer: boolean) => (
    <>
      <ul className={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, 'exact' in item && item.exact);
          const badge = badgeFor(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={inDrawer ? closeFromLink : undefined}
              >
                <Icon size={17} strokeWidth={2} aria-hidden="true" />
                {item.label}
                {badge && badge.value > 0 && (
                  <span className={styles.navBadge} title={`${badge.value} ${badge.label}`}>
                    {badge.value}
                    <span className="visually-hidden"> {badge.label}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={styles.sidebarFooter}>
        <button type="button" className={styles.logoutButton} onClick={handleLogout}>
          <LogOut size={16} strokeWidth={2} aria-hidden="true" />
          Log out
        </button>
      </div>
    </>
  );

  const brand = (
    <div>
      <div className={styles.brand}>Michael Zakka</div>
      <div className={styles.brandSub}>Admin Dashboard</div>
    </div>
  );

  return (
    <>
      <aside className={styles.sidebar}>
        {brand}
        {navigation(false)}
      </aside>

      <header className={styles.topBar}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={openDrawer}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          aria-controls={DRAWER_ID}
          aria-label={
            needsAttention > 0
              ? `Menu (${needsAttention} ${needsAttention === 1 ? 'item needs' : 'items need'} attention)`
              : 'Menu'
          }
        >
          <Menu size={20} strokeWidth={2} aria-hidden="true" />
          {needsAttention > 0 && <span className={styles.menuDot} aria-hidden="true" />}
        </button>
        <span className={styles.topBarBrand}>Michael Zakka</span>
      </header>

      <dialog
        ref={drawerRef}
        id={DRAWER_ID}
        className={styles.drawer}
        aria-label="Admin navigation"
        onClick={onDrawerClick}
        onCancel={onDrawerCancel}
        onClose={() => setDrawerOpen(false)}
      >
        <div className={styles.drawerPanel}>
          <div className={styles.drawerHeader}>
            {brand}
            <button
              type="button"
              className={styles.drawerClose}
              onClick={() => closeDrawer(drawerRef.current)}
              aria-label="Close menu"
            >
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          {navigation(true)}
        </div>
      </dialog>
    </>
  );
}
