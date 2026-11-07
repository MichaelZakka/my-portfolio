'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Languages, Menu, X } from 'lucide-react';
import styles from './Navigation.module.css';
import { trackEvent } from '../lib/analyticsClient';
import { Link, usePathname } from '../../i18n/navigation';
import { localizedPath } from '../../i18n/paths';

const NAV_ITEMS = ['hero', 'about', 'projects', 'experience', 'contact'] as const;
const LABEL_KEY = { hero: 'home', about: 'about', projects: 'projects', experience: 'experience', contact: 'contact' } as const;

export default function Navigation() {
  const t = useTranslations();
  const locale = useLocale();
  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  // Locale-less pathname, e.g. "/" on both /ar and /
  const pathname = usePathname();
  const isHome = pathname === '/';
  const home = localizedPath(locale, '/');

  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(isHome ? 'hero' : '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Active link: whichever tracked section crosses a band near the top of the viewport
  useEffect(() => {
    if (!isHome) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    NAV_ITEMS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isHome]);

  useEffect(() => {
    if (!isHome) return;
    const hash = window.location.hash.replace('#', '');
    if (!hash || hash === 'main') return;

    let cancelled = false;
    const tryScroll = (attemptsLeft: number) => {
      if (cancelled) return;
      if (document.getElementById(hash)) {
        scrollToSection(hash);
        // Drop the hash once we've scrolled so the URL stays clean
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        return;
      }
      if (attemptsLeft > 0) window.setTimeout(() => tryScroll(attemptsLeft - 1), 50);
    };
    const timer = window.setTimeout(() => tryScroll(10), 50);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isHome]);

  // Mobile menu: lock scroll, move focus into the panel, Escape closes and returns focus
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    if (!isMobileMenuOpen) return;
    menuRef.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isMobileMenuOpen]);

  const navigateToSection = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    if (sectionId === 'hero') {
      if (isHome) window.scrollTo({ top: 0, behavior: 'smooth' });
      else window.location.assign(home);
      return;
    }
    if (isHome) {
      scrollToSection(sectionId);
      return;
    }
    window.location.assign(`${home === '/' ? '' : home}/#${sectionId}`);
  };

  const solid = isScrolled || isMobileMenuOpen || !isHome;
  const current = isHome ? activeSection : '';

  return (
    <header className={`${styles.navigation} ${solid ? styles.scrolled : ''}`}>
      <nav className={`container ${styles.bar}`} aria-label={t('nav.label')}>
        <Link href="/" className={styles.logo} onClick={() => setIsMobileMenuOpen(false)}>
          <span className={styles.logoName}>
            Michael <span className={styles.logoAccent}>Zakka</span>
          </span>
          <span className={styles.logoRole}>
            {t('meta.jobTitle').replace(/\s*\([^)]*\)/, '')}
          </span>
        </Link>

        <ul
          id="primary-menu"
          ref={menuRef}
          className={`${styles.navList} ${isMobileMenuOpen ? styles.open : ''}`}
        >
          {NAV_ITEMS.map((id) => (
            <li key={id}>
              <a
                href={id === 'hero' ? home : `${home === '/' ? '' : home}/#${id}`}
                className={`${styles.navLink} ${current === id ? styles.active : ''}`}
                aria-current={current === id ? 'true' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToSection(id);
                }}
              >
                {t(`nav.${LABEL_KEY[id]}`)}
              </a>
            </li>
          ))}
          <li className={styles.ctaItem}>
            <Link
              href="/work-with-me"
              className={`btn btn-primary ${styles.cta}`}
              aria-current={pathname === '/work-with-me' ? 'page' : undefined}
              onClick={() => {
                trackEvent('cta_click', { label: 'work-with-me' });
                setIsMobileMenuOpen(false);
              }}
            >
              {t('nav.workWithMe')}
            </Link>
          </li>
        </ul>

        <div className={styles.tools}>
          <Link
            href={pathname}
            locale={otherLocale}
            className={styles.lang}
            hrefLang={otherLocale}
            aria-label={t('common.switchLanguageLabel')}
            onClick={() => trackEvent('cta_click', { label: `lang-${otherLocale}` })}
          >
            <Languages size={16} aria-hidden />
            <span lang={otherLocale}>{t('common.switchLanguage')}</span>
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            className={styles.menuButton}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label={isMobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={isMobileMenuOpen}
            aria-controls="primary-menu"
          >
            {isMobileMenuOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>
      </nav>
    </header>
  );
}
