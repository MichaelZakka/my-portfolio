'use client';

import styles from './Hero.module.css';
import { trackEvent } from '../lib/analyticsClient';

export default function HeroCtas() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.ctaButtons}>
      <button
        type="button"
        className={`${styles.button} ${styles.primary}`}
        onClick={() => {
          trackEvent('cta_click', { label: 'view-work' });
          scrollToSection('projects');
        }}
      >
        View My Work
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.secondary}`}
        onClick={() => {
          trackEvent('cta_click', { label: 'hero-contact' });
          scrollToSection('contact');
        }}
      >
        Let&apos;s Build Your Product
      </button>
    </div>
  );
}
