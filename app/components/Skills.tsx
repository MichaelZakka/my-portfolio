import { useMessages, useTranslations } from 'next-intl';
import styles from './Skills.module.css';
import Reveal from './motion/Reveal';
import { SKILL_GROUPS } from '../../data/skills';
import { contentFrom, localizeSkill, localizeSkillGroup } from '../lib/localizedContent';

export default function Skills() {
  const t = useTranslations('skills');
  const content = contentFrom(useMessages());

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
          {SKILL_GROUPS.map((category, idx) => (
            <Reveal key={category.id} index={idx} className={styles.item}>
              <div className={`card ${styles.card}`}>
                <h3 className={styles.title}>
                  {localizeSkillGroup(category.id, category.title, content)}
                </h3>
                <ul className={styles.chips}>
                  {category.skills.map((skill, sIdx) => (
                    <li
                      key={skill}
                      className={styles.chip}
                      style={{ '--i': sIdx } as React.CSSProperties}
                    >
                      {localizeSkill(skill, content)}
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
