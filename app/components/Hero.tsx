import Image from 'next/image';
import styles from './Hero.module.css';
import michaelImage from '../assets/Michael.webp';
import HeroCtas from './HeroCtas';

export default function Hero() {
  return (
    <section id="hero" className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.textContent}>
            <h1 className={styles.name}>
              <span className={styles.greeting}>Hello, I&apos;m</span>
              <span className={styles.nameHighlight}>Michael Zakka</span>
            </h1>
            <h2 className={styles.title}>IT Engineer & Full-Stack Developer</h2>
            <p className={styles.tagline}>
              &quot;Crafting technology that makes an impact.&quot;
            </p>
            <HeroCtas />
          </div>
          <div className={styles.imageWrapper}>
            <div className={styles.imageContainer}>
              <Image
                src={michaelImage}
                alt="Michael Zakka — IT Engineer and Full-Stack Developer"
                width={350}
                height={350}
                priority
                sizes="(max-width: 640px) 220px, (max-width: 968px) 280px, 350px"
                className={styles.profileImage}
                placeholder="blur"
              />
            </div>
          </div>
        </div>
        <div className={styles.scrollIndicator} aria-hidden="true">
          <div className={styles.mouse}></div>
        </div>
      </div>
    </section>
  );
}
