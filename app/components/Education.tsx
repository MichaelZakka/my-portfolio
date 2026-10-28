import { useTranslations } from 'next-intl';
import { GraduationCap } from 'lucide-react';
import styles from './Education.module.css';
import Reveal from './motion/Reveal';

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
          <p className="eyebrow" data-index="06">{t('eyebrow')}</p>
          <h2 id="education-title" className="section-title">
            {t('title')}
          </h2>
        </Reveal>
        <div className={styles.list}>
          {education.map((edu) => (
            <Reveal key={edu.degree} className={`card ${styles.card}`}>
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
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
