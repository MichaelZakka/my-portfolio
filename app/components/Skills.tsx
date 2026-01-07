import styles from './Skills.module.css';

export default function Skills() {
  const skillCategories = [
    {
      title: 'Frontend',
      skills: [
        { name: 'React', level: 5 },
        { name: 'Next.js', level: 5 },
        { name: 'JavaScript', level: 4 },
        { name: 'Shopify', level: 4 },
        { name: 'HTML/CSS', level: 4 },
        { name: 'Vue.js', level: 3.5 },
      ],
    },
    {
      title: 'Mobile development',
      skills: [
        { name: 'Flutter', level: 5 },
        { name: 'Dart', level: 4 },
        { name: 'Firebase', level: 3 },
        { name: 'GetX', level: 4 },
        { name: 'BLOC', level: 4 },
        { name: 'Responsive designs', level: 4 },
      ],
    },
    {
      title: 'Soft skills',
      skills: [
        { name: 'Team Work', level: 5 },
        { name: 'Communication skills', level: 5 },
        { name: 'Flexibility', level: 5 },
        { name: 'Working under pressure', level: 5 },
        { name: 'Multitasking', level: 5 },
        { name: 'Deadline Commitment', level: 4 },
      ],
    },
    {
      title: 'Tools & Other',
      skills: [
        { name: 'Agile', level: 5 },
        { name: 'Git & Github', level: 5 },
        { name: 'VS Code', level: 5 },
        { name: 'Trello', level: 5 },
        { name: 'Postman', level: 5 },
      ],
    },
  ];

  return (
    <section id="skills" className={styles.skills}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Skills & Tech Stack</h2>
        <div className={styles.skillsGrid}>
          {skillCategories.map((category, idx) => (
            <div key={idx} className={styles.categoryCard}>
              <h3 className={styles.categoryTitle}>{category.title}</h3>
              <div className={styles.skillsList}>
                {category.skills.map((skill, skillIdx) => {
                  return (
                    <div key={skillIdx} className={styles.skillTag}>
                      <span className={styles.skillName}>{skill.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

