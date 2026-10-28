import { Github, Linkedin, MapPin } from 'lucide-react';
import styles from './Hero.module.css';
import HeroCtas from './HeroCtas';
import JobTitle from './JobTitle';
import { useTranslations } from 'next-intl';
import { GITHUB_URL, LINKEDIN_URL } from '../lib/site';
import { TOP_STACK } from '../../data/skills';

export default function Hero() {
  const t = useTranslations('hero');
  const jobTitle = useTranslations('meta')('jobTitle');
  const openTo = [t('openToRemote'), t('openToOnsite')].join(' · ');

  return (
    <section id="hero" className={styles.hero}>
      <div className={styles.overlay} aria-hidden="true" />

      <div className={`container ${styles.inner}`}>
        <div className={styles.text}>
          <p className={styles.badge}>
            <span className={styles.badgeDot} aria-hidden="true" />
            {t('openTo', { list: openTo })}
            <MapPin size={14} aria-hidden />
          </p>
          <p className={styles.greeting}>{t('greeting')}</p>
          <h1 className={styles.name}>{t('name')}</h1>
          <p className={styles.role}>
            <JobTitle title={jobTitle} />
          </p>
          <p className={styles.intro}>{t('intro')}</p>
          <HeroCtas />
          <ul className={styles.social}>
            {GITHUB_URL && (
              <li>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label={t('github')}>
                  <Github size={20} aria-hidden />
                </a>
              </li>
            )}
            <li>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label={t('linkedin')}>
                <Linkedin size={20} aria-hidden />
              </a>
            </li>
          </ul>

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
