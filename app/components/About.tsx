import styles from './About.module.css';

export default function About() {
  return (
    <section id="about" className={styles.about}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>About Me</h2>
        <div className={styles.content}>
          <div className={styles.textContent}>
            <p className={styles.paragraph}>
            Information Technology Engineering graduate and Full Stack Developer specializing in building complete web solutions. I'm driven by the intersection of technology and business, creating digital products that deliver both technical quality and measurable value. Always exploring new opportunities to turn innovative ideas into impactful applications.
            </p>
            <div className={styles.tags}>
              <span className={styles.tag}>Problem Solving</span>
              <span className={styles.tag}>SOLID principles</span>
              <span className={styles.tag}>Frontend Development</span>
              <span className={styles.tag}>UI/UX Implementation</span>
              <span className={styles.tag}>Full Stack Development</span>
              <span className={styles.tag}>Web Development</span>
              <span className={styles.tag}>Mobile apps Development</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

