import { getLocale, getTranslations } from 'next-intl/server';
import styles from './Skills.module.css';
import Reveal from './motion/Reveal';
import { getPortfolio } from '../lib/content/portfolio';

export default async function Skills() {
  const t = await getTranslations('skills');
  const { skillGroups } = await getPortfolio(await getLocale());

  return (
    <section id="skills" className="section" aria-labelledby="skills-title">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow" data-index="05">{t('eyebrow')}</p>
          <h2 id="skills-title" className="section-title">
            {t('title')}
          </h2>
        </Reveal>
        <div className={styles.grid}>
          {skillGroups.map((category, idx) => (
            <Reveal key={category.id} index={idx} className={styles.item}>
              <div className={`card ${styles.card}`}>
                <h3 className={styles.title}>
                  {category.title}
                </h3>
                <ul className={styles.chips}>
                  {category.skills.map((skill, sIdx) => (
                    <li
                      key={`${sIdx}-${skill}`}
                      className={styles.chip}
                      style={{ '--i': sIdx } as React.CSSProperties}
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
