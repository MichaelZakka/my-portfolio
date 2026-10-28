import styles from './Skills.module.css';
import Reveal from './motion/Reveal';

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
    <section id="skills" className="section">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow" data-index="05">Skills</p>
          <h2 className="section-title">Skills &amp; Tech Stack</h2>
        </Reveal>
        <div className={styles.grid}>
          {skillCategories.map((category, idx) => (
            <Reveal key={category.title} index={idx} className={styles.item}>
              <div className={`card ${styles.card}`}>
                <h3 className={styles.title}>{category.title}</h3>
                <ul className={styles.chips}>
                  {category.skills.map((skill, sIdx) => (
                    <li
                      key={skill.name}
                      className={styles.chip}
                      style={{ '--i': sIdx } as React.CSSProperties}
                    >
                      {skill.name}
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
