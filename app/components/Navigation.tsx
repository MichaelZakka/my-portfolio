'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import styles from './Navigation.module.css';
import { trackEvent } from '../lib/analyticsClient';

const NAV_ITEMS = [
  { id: 'hero', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
] as const;

const SECTION_IDS = NAV_ITEMS.map((item) => item.id);

export default function Navigation() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isWorkWithMe = pathname === '/work-with-me';

  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState(isHome ? 'hero' : '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isHome]);

  useEffect(() => {
    if (!isHome) return;
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

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

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    if (!isMobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
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
      else window.location.assign('/');
      return;
    }
    if (isHome) {
      scrollToSection(sectionId);
      return;
    }
    window.location.assign(`/#${sectionId}`);
  };

  const solid = isScrolled || isMobileMenuOpen || !isHome;
  const current = isHome ? activeSection : '';

  return (
    <header className={`${styles.navigation} ${solid ? styles.scrolled : ''}`}>
      <nav className={`container ${styles.bar}`} aria-label="Primary">
        <Link href="/" className={styles.logo} onClick={() => setIsMobileMenuOpen(false)}>
          <span className={styles.logoName}>
            Michael <span className={styles.logoAccent}>Zakka</span>
          </span>
          <span className={styles.logoRole}>Frontend Developer</span>
        </Link>

        <ul id="primary-menu" className={`${styles.navList} ${isMobileMenuOpen ? styles.open : ''}`}>
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <a
                href={item.id === 'hero' ? '/' : `/#${item.id}`}
                className={`${styles.navLink} ${current === item.id ? styles.active : ''}`}
                aria-current={current === item.id ? 'true' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToSection(item.id);
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
          <li className={styles.ctaItem}>
            <Link
              href="/work-with-me"
              className={`btn btn-primary ${styles.cta}`}
              onClick={() => {
                trackEvent('cta_click', { label: 'work-with-me' });
                setIsMobileMenuOpen(false);
              }}
              aria-current={isWorkWithMe ? 'page' : undefined}
            >
              Work with me
            </Link>
          </li>
        </ul>

        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="primary-menu"
        >
          {isMobileMenuOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
        </button>
      </nav>
    </header>
  );
}
