'use client';

import { ArrowRight, Mail } from 'lucide-react';
import styles from './Hero.module.css';
import { trackEvent } from '../lib/analyticsClient';

export default function HeroCtas() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.ctas}>
      <a
        href="#projects"
        className="btn btn-primary"
        onClick={(e) => {
          e.preventDefault();
          trackEvent('cta_click', { label: 'view-work' });
          scrollToSection('projects');
        }}
      >
        View My Work
        <ArrowRight size={18} aria-hidden className="flip-rtl" />
      </a>
      <a
        href="#contact"
        className="btn btn-outline"
        onClick={(e) => {
          e.preventDefault();
          trackEvent('cta_click', { label: 'hero-contact' });
          scrollToSection('contact');
        }}
      >
        <Mail size={18} aria-hidden />
        Contact Me
      </a>
    </div>
  );
}
