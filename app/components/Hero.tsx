import { Github, Linkedin, MapPin } from 'lucide-react';
import styles from './Hero.module.css';
import HeroCtas from './HeroCtas';
import { GITHUB_URL, JOB_TITLE, LINKEDIN_URL, OPEN_TO } from '../lib/site';

const TECH = ['Next.js', 'React', 'JavaScript', 'Shopify', 'Flutter', 'Vercel'];

export default function Hero() {
  return (
    <section id="hero" className={styles.hero}>
      <div className={styles.overlay} aria-hidden="true" />

      <div className={`container ${styles.inner}`}>
        <div className={styles.text}>
          <p className={styles.badge}>
            <span className={styles.badgeDot} aria-hidden="true" />
            Open to {OPEN_TO.join(' · ')}
            <MapPin size={14} aria-hidden />
          </p>
          <p className={styles.greeting}>Hello, I&apos;m</p>
          <h1 className={styles.name}>
            Michael Zakka
          </h1>
          <p className={styles.role}>{JOB_TITLE}</p>
          <p className={styles.intro}>
            Frontend developer building production React &amp; Next.js apps: bilingual
            (Arabic/English, RTL/LTR), fast, and shipped to real users.
          </p>
          <HeroCtas />
          <ul className={styles.social}>
            {GITHUB_URL && (
              <li>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="GitHub profile">
                  <Github size={20} aria-hidden />
                </a>
              </li>
            )}
            <li>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile">
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
              <span className={styles.techLabel}>Tech I work with</span>
            </div>
            <p className={styles.techPrompt} aria-hidden="true">
              <span className={styles.techSign}>$</span> ls ~/stack
            </p>
            <ul className={styles.techList} aria-label="Tech I work with">
              {TECH.map((t, i) => (
                <li key={t} style={{ '--i': i } as React.CSSProperties}>
                  {t}
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
