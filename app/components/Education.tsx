import { useTranslations } from 'next-intl';
import { Award, GraduationCap } from 'lucide-react';
import styles from './Education.module.css';
import Reveal from './motion/Reveal';

/** IELTS result, earned 26 May 2026. */
const IELTS = {
  overall: '6.5',
  bands: [
    { key: 'listening', score: '7' },
    { key: 'reading', score: '6.5' },
    { key: 'writing', score: '6' },
    { key: 'speaking', score: '7' },
  ],
} as const;

export default function Education() {
  const t = useTranslations('education');
  const education = [
    {
      degree: t('degree'),
      institution: t('institution'),
      location: t('location'),
      duration: t('duration'),
      description: t('description'),
    },
  ];

  return (
    <section id="education" className="section" aria-labelledby="education-title">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow" data-index="06">
            {t('eyebrow')}
          </p>
          <h2 id="education-title" className="section-title">
            {t('title')}
          </h2>
        </Reveal>
        <div className={styles.list}>
          {education.map((edu) => (
            <Reveal key={edu.degree}>
              <div className={`card card-interactive ${styles.card}`}>
                <GraduationCap size={36} strokeWidth={1.6} className={styles.icon} aria-hidden />
                <div className={styles.body}>
                  <div className={styles.header}>
                    <h3 className={styles.degree}>{edu.degree}</h3>
                    <span className={styles.duration}>{edu.duration}</span>
                  </div>
                  <p className={styles.institution}>
                    {edu.institution} <span className={styles.location}>· {edu.location}</span>
                  </p>
                  <p className={styles.description}>{edu.description}</p>
                </div>
              </div>
            </Reveal>
          ))}

          <Reveal index={1}>
            <div className={`card card-interactive ${styles.card}`}>
              <Award size={36} strokeWidth={1.6} className={styles.icon} aria-hidden />
              <div className={styles.body}>
                <div className={styles.header}>
                  <h3 className={styles.degree}>{t('certTitle')}</h3>
                  <time dateTime="2026-05-26" className={styles.duration} title={t('certDateFull')}>
                    {t('certDate')}
                  </time>
                </div>
                <p className={styles.institution}>{t('certIssuer')}</p>

                <div className={styles.scores}>
                  <div className={styles.overall}>
                    <span className={styles.overallScore}>{IELTS.overall}</span>
                    <span className={styles.overallLabel}>{t('overall')}</span>
                  </div>
                  <dl className={styles.bands} aria-label={t('bandsLabel')}>
                    {IELTS.bands.map((band) => (
                      <div key={band.key} className={styles.band}>
                        <dt>{t(band.key)}</dt>
                        <dd>{band.score}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
