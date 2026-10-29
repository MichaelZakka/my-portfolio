import Image from 'next/image';
import { Github } from 'lucide-react';
import styles from './Hero.module.css';
import HeroCtas from './HeroCtas';
import { useTranslations } from 'next-intl';
import { GITHUB_URL } from '../lib/site';
import { TOP_STACK } from '../../data/skills';

export default function Hero() {
  const t = useTranslations('hero');
  const jobTitle = useTranslations('meta')('jobTitle');

  return (
    <section id="hero" className={styles.hero}>
      <div className={styles.overlay} aria-hidden="true" />

      <div className={`container ${styles.inner}`}>
        <div className={styles.text}>
          <p className={styles.greeting}>{t('greeting')}</p>
          <h1 className={styles.name}>{t('name')}</h1>
          {/* Hero shows the short title; the "(React / Next.js)" part stays in metadata, nav and footer */}
          <p className={styles.role}>{jobTitle.replace(/\s*\([^)]*\)/, '')}</p>
          <p className={styles.intro}>{t('intro')}</p>
          <HeroCtas />
          {GITHUB_URL && (
            <ul className={styles.social}>
              <li>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label={t('github')}>
                  <Github size={20} aria-hidden />
                </a>
              </li>
            </ul>
          )}

          <div className={styles.tech}>
            <div className={styles.techBar} aria-hidden="true">
              <span className={styles.techDots}>
                <i />
                <i />
                <i />
              </span>
              <span className={styles.techLabel}>{t('stackLabel')}</span>
            </div>
            <p className={styles.techPrompt} aria-hidden="true" dir="ltr" lang="en">
              <span className={styles.techSign}>$</span> ls ~/stack
            </p>
            <ul className={styles.techList} aria-label={t('stackLabel')} dir="ltr" lang="en">
              {TOP_STACK.map((tech, i) => (
                <li key={tech} style={{ '--i': i } as React.CSSProperties}>
                  {tech}
                </li>
              ))}
              <li className={styles.caret} aria-hidden="true" />
            </ul>
          </div>
        </div>

      </div>

    </section>
  );
}
