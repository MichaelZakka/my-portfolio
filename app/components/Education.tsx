import styles from './Education.module.css';

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
    <section id="education" className={styles.education}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Education & Certifications</h2>
        
        <div className={styles.section}>
          <h3 className={styles.subsectionTitle}>Education</h3>
          <div className={styles.educationList}>
            {education.map((edu, idx) => (
              <div key={idx} className={styles.educationCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h4 className={styles.degree}>{edu.degree}</h4>
                    <h5 className={styles.institution}>{edu.institution}</h5>
                    <p className={styles.location}>{edu.location}</p>
                  </div>
                  <span className={styles.duration}>{edu.duration}</span>
                </div>
                <p className={styles.description}>{edu.description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

