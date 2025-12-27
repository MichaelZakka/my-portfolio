'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './Stats.module.css';

export default function Stats() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const stats = [
    {
      number: 8,
      suffix: '+',
      label: 'Years Experience',
      icon: '⏱️',
    },
    {
      number: 150,
      suffix: '+',
      label: 'Projects Completed',
      icon: '🚀',
    },
    {
      number: 50,
      suffix: '+',
      label: 'Happy Clients',
      icon: '😊',
    },
    {
      number: 30,
      suffix: '+',
      label: 'Technologies Mastered',
      icon: '💡',
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  const AnimatedNumber = ({ target, suffix }: { target: number; suffix: string }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!isVisible) return;

      let start = 0;
      const duration = 2000;
      const increment = target / (duration / 16);

      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(timer);
    }, [isVisible, target]);

    return (
      <span>
        {count}
        {suffix}
      </span>
    );
  };

  return (
    <section ref={sectionRef} id="stats" className={styles.stats}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>By The Numbers</h2>
        <div className={styles.statsGrid}>
          {stats.map((stat, idx) => (
            <div key={idx} className={styles.statCard}>
              <div className={styles.icon}>{stat.icon}</div>
              <div className={styles.number}>
                <AnimatedNumber target={stat.number} suffix={stat.suffix} />
              </div>
              <div className={styles.label}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

