import styles from './Hero.module.css';
import HeroCtas from './HeroCtas';

const TECH = ['Next.js', 'React', 'JavaScript', 'Shopify', 'Flutter', 'Vercel'];

export default function Hero() {
  return (
    <section id="hero" className={styles.hero}>
      <div className={styles.overlay} aria-hidden="true" />

      <div className={`container ${styles.inner}`}>
        <div className={styles.text}>
          <p className={styles.greeting}>Hello, I&apos;m</p>
          <h1 className={styles.name}>
            Michael Zakka
          </h1>
          <h2 className={styles.role}>Frontend Developer</h2>
          <p className={styles.intro}>
            I build fast, bilingual Arabic/English websites and web apps for businesses in
            Syria, Saudi Arabia, and beyond.
          </p>
          <HeroCtas />

          <div className={styles.tech}>
            <div className={styles.techBar} aria-hidden="true">
              <span className={styles.techDots}>
                <i />
                <i />
                <i />
              </span>
              <span className={styles.techLabel}>Tech I work with</span>
            </div>
            <p className={styles.techPrompt} aria-hidden="true">
              <span className={styles.techSign}>$</span> ls ~/stack
            </p>
            <ul className={styles.techList} aria-label="Tech I work with">
              {TECH.map((t, i) => (
                <li key={t} style={{ '--i': i } as React.CSSProperties}>
                  {t}
                </li>
              ))}
              <li className={styles.caret} aria-hidden="true" />
            </ul>
          </div>
        </div>
      </div>

    </section>
  );
}
