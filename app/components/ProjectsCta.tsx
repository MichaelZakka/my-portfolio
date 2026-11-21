'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './ProjectsCta.module.css';
import { Link } from '../../i18n/navigation';
import { trackEvent } from '../lib/analyticsClient';

/** "Work with me" call to action under the project cards. */
export default function ProjectsCta() {
  const t = useTranslations('projects');

  return (
    <div className={styles.panel}>
      <p className={styles.title}>{t('ctaText')}</p>
      <p className={styles.text}>{t('ctaSubtext')}</p>
      <Link
        href="/work-with-me"
        className={styles.button}
        onClick={() => trackEvent('cta_click', { label: 'projects-work-with-me' })}
      >
        <span className={styles.label}>{t('ctaButton')}</span>
        <span className={styles.chip} aria-hidden="true">
          <ArrowRight size={18} strokeWidth={2.25} className="flip-rtl" />
        </span>
      </Link>
    </div>
  );
}
