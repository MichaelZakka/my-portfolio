'use client';

import { ArrowRight, FileDown } from 'lucide-react';
import styles from './Hero.module.css';
import { trackEvent } from '../lib/analyticsClient';
import { useTranslations } from 'next-intl';
import { Link } from '../../i18n/navigation';

/** The CV button is left out while no CV link is set (Admin → Content → Profile). */
export default function HeroCtas({ resumeUrl }: { resumeUrl: string }) {
  const t = useTranslations('hero');
  const tNav = useTranslations('nav');
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.ctas}>
      {/* Mobile only: the nav CTA is tucked in the menu there, so it leads the hero instead */}
      <Link
        href="/work-with-me"
        className={`btn btn-primary ${styles.hireCta}`}
        onClick={() => trackEvent('cta_click', { label: 'hero-work-with-me' })}
      >
        {tNav('workWithMe')}
        <ArrowRight size={18} aria-hidden className="flip-rtl" />
      </Link>
      <a
        href="#projects"
        className={`btn btn-primary ${styles.viewWork}`}
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
