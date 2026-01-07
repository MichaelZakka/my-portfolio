import styles from './Experience.module.css';

export default function Experience() {
  const experiences = [
    {
      company: 'Freelance',
      role: 'Web Developer',
      duration: '2024 - Present',
      location: 'Remote - Freelance',
      achievements: [
        'Built responsive web applications and landing pages using React and Next.js',
        'Developed custom websites and web solutions for various clients across different industries',
        'Provided end-to-end development services from requirements gathering to deployment',
        'Maintained direct client communication to ensure project requirements and deadlines were met',
      ],
    },
    {
      company: 'Toward Greatness',
      role: 'Fullstack Developer',
      duration: 'Oct 2025 - Present',
      location: 'Online - Full time',
      website: 'https://www.tgmena.com/',
      achievements: [
        'Implementing landing pages and web projects using React & Next.js',
        'Creating and managing Shopify stores',
        'Analyzing tech solutions with team members',
      ],
    },
    {
      company: 'B-wire',
      role: 'Flutter Developer',
      duration: 'Apr 2024 - Dec 2024',
      location: 'On site (Damascus - AlShalaan) - Full time',
      website: 'https://b-wire.co/',
      achievements: [
        'Developed cross-platform mobile applications for Android and iOS based on Software Requirement Specifications (SRS) and UI/UX designs',
        'Collaborated closely with backend teams to integrate APIs and ensure seamless functionality',
        'Delivered responsive, user-friendly applications using Flutter while maintaining effective communication with designers and stakeholders to meet project objectives',
      ],
    },
  ];

  return (
    <section id="experience" className={styles.experience}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Professional Experience</h2>
        <div className={styles.timeline}>
          {experiences.map((exp, idx) => (
            <div key={idx} className={styles.timelineItem}>
              <div className={styles.timelineMarker}></div>
              <div className={styles.timelineContent}>
                <div className={styles.header}>
                  <div>
                    <h3 className={styles.role}>{exp.role}</h3>
                    <h4 className={styles.company}>
                      <a href={exp.website} target="_blank" rel="noopener noreferrer" className={styles.companyLink}>
                        {exp.company}
                      </a>
                    </h4>
                    {exp.location && (
                      <p className={styles.location}>{exp.location}</p>
                    )}
                  </div>
                  <span className={styles.duration}>{exp.duration}</span>
                </div>
                <ul className={styles.achievements}>
                  {exp.achievements.map((achievement, achIdx) => (
                    <li key={achIdx}>{achievement}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

