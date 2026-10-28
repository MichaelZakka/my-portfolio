import { GraduationCap } from 'lucide-react';
import styles from './Education.module.css';
import Reveal from './motion/Reveal';

export default function Education() {
  const education = [
    {
      degree: 'Bachelor of Information Technology Engineering',
      institution: 'Damascus University',
      location: 'Damascus',
      duration: '2020 - 2025',
      description: 'Specialized in Artificial Intelligence and natural languages',
    },
  ];

  return (
    <section id="education" className="section">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow" data-index="06">Education</p>
          <h2 className="section-title">Education</h2>
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
