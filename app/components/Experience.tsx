import { ArrowUpRight } from 'lucide-react';
import styles from './Experience.module.css';
import Reveal from './motion/Reveal';

export default function Experience() {
  const experiences = [
    {
      company: 'Freelance',
      role: 'Web Developer',
      duration: '2024 - Present',
      location: 'Remote - Freelance',
      website: undefined as string | undefined,
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
    <section id="experience" className="section">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow" data-index="04">Experience</p>
          <h2 className="section-title">Where I&apos;ve Worked</h2>
        </Reveal>
        <ol className={styles.timeline}>
          {experiences.map((exp, idx) => (
            <Reveal as="li" key={exp.company} index={idx} className={styles.item}>
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
                <ul className={styles.achievements}>
                  {exp.achievements.map((achievement) => (
                    <li key={achievement}>{achievement}</li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
