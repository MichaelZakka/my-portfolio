'use client';

import { ArrowRight, FileDown } from 'lucide-react';
import styles from './Hero.module.css';
import { trackEvent } from '../lib/analyticsClient';
import { useTranslations } from 'next-intl';

/** The CV button is left out while no CV link is set (Admin → Content → Profile). */
export default function HeroCtas({ resumeUrl }: { resumeUrl: string }) {
  const t = useTranslations('hero');
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
        {t('viewProjects')}
        <ArrowRight size={18} aria-hidden className="flip-rtl" />
      </a>
      {resumeUrl && (
        <a
          href={resumeUrl}
          download
          className="btn btn-outline"
          onClick={() => trackEvent('cta_click', { label: 'hero-resume' })}
        >
          <FileDown size={18} aria-hidden />
          {t('downloadResume')}
        </a>
      )}
    </div>
  );
}
