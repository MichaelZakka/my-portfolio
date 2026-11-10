import { getLocale, getTranslations } from 'next-intl/server';
import styles from './Hero.module.css';
import HeroCtas from './HeroCtas';
import { getPortfolio } from '../lib/content/portfolio';
import { SOCIAL_ICONS } from '../lib/content/icons';

export default async function Hero() {
  const t = await getTranslations('hero');
  const jobTitle = (await getTranslations('meta'))('jobTitle');
  const { profile, socials, topStack } = await getPortfolio(await getLocale());
  const links = socials.filter((s) => s.hero);

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
          <HeroCtas resumeUrl={profile.resumeUrl} />
          {links.length > 0 && (
            <ul className={styles.social}>
              {links.map((link) => {
                const Icon = SOCIAL_ICONS[link.platform];
                return (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      aria-label={link.platform === 'github' ? t('github') : link.name}
                      title={link.name}
                    >
                      <Icon size={20} aria-hidden />
                    </a>
                  </li>
                );
              })}
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
              {topStack.map((tech, i) => (
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
