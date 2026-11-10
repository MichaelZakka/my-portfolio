import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowUpRight } from 'lucide-react';
import styles from './Experience.module.css';
import Reveal from './motion/Reveal';
import { isTodo, showValue } from '../../data/todo';
import { getPortfolio } from '../lib/content/portfolio';

export default async function Experience() {
  const t = await getTranslations('experience');
  const { experience } = await getPortfolio(await getLocale());

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
          {experience.map((exp, idx) => {
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
                  {exp.achievements.map((a, aIdx) => (
                    <li key={aIdx}>
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
