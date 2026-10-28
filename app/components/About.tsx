import { useTranslations } from 'next-intl';
import { MapPin, Mail, Linkedin, Languages, Download } from 'lucide-react';
import styles from './About.module.css';
import Reveal from './motion/Reveal';
import { EMAIL, LINKEDIN_URL, RESUME_URL } from '../lib/site';

export default function About() {
  const t = useTranslations('about');

  const info = [
    { icon: MapPin, label: t('location'), value: t('locationValue') },
    { icon: Mail, label: t('email'), value: EMAIL, href: `mailto:${EMAIL}`, ltr: true },
    { icon: Linkedin, label: t('linkedin'), value: 'in/michael-zakka', href: LINKEDIN_URL, ltr: true },
    { icon: Languages, label: t('languages'), value: t('languagesValue') },
  ];

  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <div className={`container ${styles.grid}`}>
        <Reveal>
          <p className="eyebrow" data-index="01">{t('eyebrow')}</p>
          <h2 id="about-title" className="section-title">
            {t('title')}
          </h2>
          <p className={styles.paragraph}>{t('paragraph')}</p>

          <a href={RESUME_URL} download className="btn btn-primary">
            {t('downloadResume')}
            <Download size={17} aria-hidden />
          </a>
        </Reveal>

        <Reveal index={1} className={`card ${styles.infoCard}`}>
          <dl>
            {info.map(({ icon: Icon, label, value, href, ltr }) => (
              <div key={label} className={styles.infoRow}>
                <dt className={styles.infoLabel}>
                  <Icon size={22} aria-hidden className={styles.infoIcon} />
                  {label}
                </dt>
                <dd className={styles.infoValue} dir={ltr ? 'ltr' : undefined}>
                  {href ? <a href={href}>{value}</a> : value}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
