'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Inbox, FolderKanban, LineChart, Globe, LogOut } from 'lucide-react';
import styles from '../admin.module.css';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/requests', label: 'Requests', icon: Inbox },
  { href: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { href: '/admin/visitors', label: 'Analytics', icon: LineChart },
  { href: '/admin/site', label: 'Site', icon: Globe },
] as const;

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

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const badges = useBadges(pathname);
  const badgeFor = (href: string) =>
    href === '/admin/projects'
      ? { value: badges.messages, label: 'unread client messages' }
      : href === '/admin/site'
        ? { value: badges.problems, label: 'open problems' }
        : null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <aside className={styles.sidebar}>
      <div>
        <div className={styles.brand}>Michael Zakka</div>
        <div className={styles.brandSub}>Admin Dashboard</div>
      </div>
      <ul className={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, 'exact' in item && item.exact);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
              >
                <Icon size={17} strokeWidth={2} aria-hidden="true" />
                {item.label}
                {(() => {
                  const badge = badgeFor(item.href);
                  return badge && badge.value > 0 ? (
                    <span className={styles.navBadge} title={`${badge.value} ${badge.label}`}>
                      {badge.value}
                      <span className="visually-hidden"> {badge.label}</span>
                    </span>
                  ) : null;
                })()}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={styles.sidebarFooter}>
        <button type="button" className={styles.logoutButton} onClick={handleLogout} title="Log out">
          <LogOut size={16} strokeWidth={2} aria-hidden="true" />
          <span className={styles.logoutLabel}>Log out</span>
        </button>
      </div>
    </aside>
  );
}
