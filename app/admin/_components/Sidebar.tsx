'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Inbox, LineChart, Globe, LogOut } from 'lucide-react';
import styles from '../admin.module.css';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/requests', label: 'Requests', icon: Inbox },
  { href: '/admin/visitors', label: 'Analytics', icon: LineChart },
  { href: '/admin/site', label: 'Site', icon: Globe },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
    </aside>
  );
}
