'use client';

import { ArrowRight, FileDown } from 'lucide-react';
import styles from './Hero.module.css';
import { trackEvent } from '../lib/analyticsClient';
import { RESUME_URL } from '../lib/site';

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
        View Projects
        <ArrowRight size={18} aria-hidden className="flip-rtl" />
      </a>
      <a
        href={RESUME_URL}
        download
        className="btn btn-outline"
        onClick={() => trackEvent('cta_click', { label: 'hero-resume' })}
      >
        <FileDown size={18} aria-hidden />
        Download Resume
      </a>
    </div>
  );
}
