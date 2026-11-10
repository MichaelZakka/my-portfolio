'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigationTarget } from '../../_components/AdminMain';
import c from './content.module.css';

export const CONTENT_PAGES = [
  { href: '/admin-jfaygpory6/content', label: 'Overview', exact: true },
  { href: '/admin-jfaygpory6/content/profile', label: 'Profile & contact' },
  { href: '/admin-jfaygpory6/content/social', label: 'Social links' },
  { href: '/admin-jfaygpory6/content/projects', label: 'Portfolio projects' },
  { href: '/admin-jfaygpory6/content/experience', label: 'Experience' },
  { href: '/admin-jfaygpory6/content/strengths', label: 'Strengths' },
  { href: '/admin-jfaygpory6/content/skills', label: 'Skills' },
  { href: '/admin-jfaygpory6/content/text', label: 'Section text' },
] as const;

export default function ContentNav() {
  const pathname = usePathname();
  // Highlights the target at once while it loads
  const current = useNavigationTarget() ?? pathname;
  return (
    <nav className={c.subnav} aria-label="Content sections">
      {CONTENT_PAGES.map((page) => {
        const active =
          'exact' in page && page.exact ? current === page.href : current === page.href || current.startsWith(`${page.href}/`);
        return (
          <Link
            key={page.href}
            href={page.href}
            className={c.subnavLink}
            aria-current={active ? 'page' : undefined}
          >
            {page.label}
          </Link>
        );
      })}
    </nav>
  );
}
