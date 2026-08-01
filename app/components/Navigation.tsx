'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navigation.module.css';
import { trackEvent } from '../lib/analyticsClient';

const NAV_ITEMS = [
  { id: 'hero', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'education', label: 'Education' },
  { id: 'volunteering', label: 'Volunteering' },
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
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!isHome) {
      setActiveSection('');
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      for (let i = SECTION_IDS.length - 1; i >= 0; i--) {
        const element = document.getElementById(SECTION_IDS[i]);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 120) {
            setActiveSection(SECTION_IDS[i]);
            break;
          }
        }
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome]);

  useEffect(() => {
    if (!isHome) {
      setIsScrolled(window.scrollY > 50);
      const onScroll = () => setIsScrolled(window.scrollY > 50);
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }
  }, [isHome]);

  useEffect(() => {
    if (!isHome) return;
    const hash = window.location.hash.replace('#', '');
    if (!hash || !SECTION_IDS.includes(hash as (typeof SECTION_IDS)[number])) return;

    let cancelled = false;
    const tryScroll = (attemptsLeft: number) => {
      if (cancelled) return;
      const element = document.getElementById(hash);
      if (element) {
        scrollToSection(hash);
        return;
      }
      if (attemptsLeft > 0) {
        window.setTimeout(() => tryScroll(attemptsLeft - 1), 50);
      }
    };

    const timer = window.setTimeout(() => tryScroll(10), 50);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isHome]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const navigateToSection = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    if (isHome) {
      scrollToSection(sectionId);
      return;
    }
    // Full navigation so hash scrolling works from other routes
    window.location.assign(`/#${sectionId}`);
  };

  return (
    <nav className={`${styles.navigation} ${isScrolled ? styles.scrolled : ''}`}>
      {isMobileMenuOpen && (
        <button
          type="button"
          className={styles.menuOverlay}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close menu"
        />
      )}
      <div className={styles.container}>
        <button
          type="button"
          className={styles.mobileMenuButton}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          <span className={styles.hamburger}>
            <span className={`${styles.hamburgerLine} ${isMobileMenuOpen ? styles.open : ''}`}></span>
            <span className={`${styles.hamburgerLine} ${isMobileMenuOpen ? styles.open : ''}`}></span>
            <span className={`${styles.hamburgerLine} ${isMobileMenuOpen ? styles.open : ''}`}></span>
          </span>
        </button>
        <ul className={`${styles.navList} ${isMobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`${styles.navLink} ${activeSection === item.id ? styles.active : ''}`}
                onClick={() => navigateToSection(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
          <li className={styles.ctaItem}>
            <Link
              href="/work-with-me"
              className={`${styles.ctaButton} ${isWorkWithMe ? styles.ctaActive : ''}`}
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
      </div>
    </nav>
  );
}
