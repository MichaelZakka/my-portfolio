import styles from './Skills.module.css';
import Reveal from './motion/Reveal';
import { SKILL_GROUPS } from '../../data/skills';

export default function Skills() {
  return (
    <section id="skills" className="section">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow" data-index="05">Skills</p>
          <h2 className="section-title">Skills &amp; Tech Stack</h2>
        </Reveal>
        <div className={styles.grid}>
          {SKILL_GROUPS.map((category, idx) => (
            <Reveal key={category.id} index={idx} className={styles.item}>
              <div className={`card ${styles.card}`}>
                <h3 className={styles.title}>{category.title}</h3>
                <ul className={styles.chips}>
                  {category.skills.map((skill, sIdx) => (
                    <li
                      key={skill}
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
