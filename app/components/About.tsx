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
          </div>
        </div>
      </div>
    </section>
  );
}

