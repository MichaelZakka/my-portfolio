'use client';

import Image from 'next/image';
import styles from './Hero.module.css';
import michaelImage from '../assets/Michael.png';

export default function Hero() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.textContent}>
            <h1 className={styles.name}>
              <span className={styles.greeting}>Hello, I'm</span>
              <span className={styles.nameHighlight}>Michael Zakka</span>
            </h1>
            <h2 className={styles.title}>IT Engineer & Full-Stack Developer</h2>
            <p className={styles.tagline}>
            "Crafting technology that makes an impact."

            </p>
              <div className={styles.ctaButtons}>
                <button
                  className={`${styles.button} ${styles.primary}`}
                  onClick={() => scrollToSection('projects')}
                >
                  View My Work
                </button>
                <button
                  className={`${styles.button} ${styles.secondary}`}
                  onClick={() => scrollToSection('contact')}
                >
                  Let's Build Your Product
                </button>
              </div>
          </div>
          <div className={styles.imageWrapper}>
            <div className={styles.imageContainer}>
              <Image
                src={michaelImage}
                alt="Michael Zakka"
                width={350}
                height={350}
                priority
                className={styles.profileImage}
              />
            </div>
          </div>
        </div>
        <div className={styles.scrollIndicator}>
          <div className={styles.mouse}></div>
        </div>
      </div>
    </section>
  );
}

