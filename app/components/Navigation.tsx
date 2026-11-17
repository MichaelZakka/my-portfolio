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

const HINT_ID = 'work-with-me-hint';
const HINT_SEEN_KEY = 'work-with-me-hint-seen';
const HINT_DELAY_MS = 1500;
const HINT_VISIBLE_MS = 9000;

export default function Navigation() {
  const t = useTranslations();
  const locale = useLocale();
  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  // Locale-less pathname, e.g. "/" on both /ar and /
  const pathname = usePathname();
  const isHome = pathname === '/';
  const home = localizedPath(locale, '/');
  const onSurveyPage = pathname === '/work-with-me';

  const [hintState, setHintState] = useState<'idle' | 'open' | 'dismissed'>('idle');
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

  // Desktop: point out "Work with me" once per tab session, after the intro has finished.
  // On phones the button lives in the menu, where the message is always shown beside it.
  useEffect(() => {
    if (onSurveyPage || !window.matchMedia('(min-width: 900px)').matches) return;
    try {
      if (sessionStorage.getItem(HINT_SEEN_KEY)) return;
    } catch {
      return;
    }

    let showTimer: number | undefined;
    let hideTimer: number | undefined;
    const schedule = () => {
      showTimer = window.setTimeout(() => {
        try {
          sessionStorage.setItem(HINT_SEEN_KEY, '1');
        } catch {}
        setHintState('open');
        hideTimer = window.setTimeout(
          () => setHintState((state) => (state === 'open' ? 'idle' : state)),
          HINT_VISIBLE_MS
        );
      }, HINT_DELAY_MS);
    };

    const root = document.documentElement;
    const introRunning = () => root.dataset.intro === 'play' || root.dataset.intro === 'leave';
    let observer: MutationObserver | undefined;
    if (introRunning()) {
      observer = new MutationObserver(() => {
        if (introRunning()) return;
        observer?.disconnect();
        schedule();
      });
      observer.observe(root, { attributes: true, attributeFilter: ['data-intro'] });
    } else {
      schedule();
    }

    return () => {
      observer?.disconnect();
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [onSurveyPage]);

  // Escape hides the message, even while the pointer is over the button
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHintState('dismissed');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
          <li
            className={`${styles.ctaItem} ${hintState === 'open' ? styles.hintOpen : ''} ${hintState === 'dismissed' ? styles.hintDismissed : ''}`}
            onMouseLeave={() => setHintState((state) => (state === 'dismissed' ? 'idle' : state))}
            onBlur={() => setHintState((state) => (state === 'dismissed' ? 'idle' : state))}
          >
            <Link
              href="/work-with-me"
              className={`btn btn-primary ${styles.cta}`}
              aria-current={onSurveyPage ? 'page' : undefined}
              aria-describedby={onSurveyPage ? undefined : HINT_ID}
              onClick={() => {
                trackEvent('cta_click', { label: 'work-with-me' });
                setIsMobileMenuOpen(false);
              }}
            >
              {t('nav.workWithMe')}
            </Link>
            {!onSurveyPage && (
              <span id={HINT_ID} role="tooltip" className={styles.hint}>
                <strong className={styles.hintTitle}>{t('nav.workWithMeHintTitle')}</strong>
                {t('nav.workWithMeHintText')}
              </span>
            )}
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
