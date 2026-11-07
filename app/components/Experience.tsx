import { useMessages, useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';
import styles from './Experience.module.css';
import Reveal from './motion/Reveal';
import { EXPERIENCE } from '../../data/experience';
import { isTodo, showValue } from '../../data/todo';
import { contentFrom, localizeRole } from '../lib/localizedContent';

export default function Experience() {
  const t = useTranslations('experience');
  const content = contentFrom(useMessages());

  return (
    <section id="experience" className="section" aria-labelledby="experience-title">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow" data-index="04">{t('eyebrow')}</p>
          <h2 id="experience-title" className="section-title">
            {t('title')}
          </h2>
        </Reveal>
        <ol className={styles.timeline}>
          {EXPERIENCE.map((raw, idx) => {
            const exp = localizeRole(raw, content);
            return (
            <Reveal as="li" key={exp.id} index={idx} className={styles.item}>
              <span className={styles.dot} aria-hidden="true" />
              <article className={`card ${styles.card}`}>
                <header className={styles.header}>
                  <div>
                    <h3 className={styles.role}>{exp.role}</h3>
                    <p className={styles.company}>
                      {exp.website ? (
                        <a href={exp.website} target="_blank" rel="noopener noreferrer">
                          {exp.company}
                          <ArrowUpRight size={15} aria-hidden />
                        </a>
                      ) : (
                        exp.company
                      )}
                      <span className={styles.location}> · {exp.location}</span>
                    </p>
                  </div>
                  <span className={styles.duration}>{exp.duration}</span>
                </header>
                {exp.companyNote && <p className={styles.note}>{exp.companyNote}</p>}
                <ul className={styles.achievements}>
                  {exp.achievements.map((a) => (
                    <li key={a.text}>
                      {a.text}
                      {showValue(a.result) && (
                        <>
                          {' '}
                          <span className={isTodo(a.result) ? 'todo' : styles.result}>{a.result}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
