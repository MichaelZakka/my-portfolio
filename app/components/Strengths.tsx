import { Code2, Languages, Gauge, ShoppingBag } from 'lucide-react';
import styles from './Strengths.module.css';
import Reveal from './motion/Reveal';
import { STRENGTHS, type Strength } from '../../data/strengths';

const ICONS: Record<Strength['id'], typeof Code2> = {
  nextjs: Code2,
  rtl: Languages,
  performance: Gauge,
  shopify: ShoppingBag,
};

export default function Strengths() {
  return (
    <section id="strengths" className="section" aria-labelledby="strengths-title">
      <div className="container">
        <Reveal className="section-head center">
          <p className="eyebrow" data-index="02">Strengths</p>
          <h2 id="strengths-title" className="section-title">
            What I bring to a team
          </h2>
          <span className="accent-bar" aria-hidden="true" />
        </Reveal>
        <ul className={styles.grid}>
          {STRENGTHS.map((item, idx) => {
            const Icon = ICONS[item.id];
            return (
              <Reveal as="li" key={item.id} index={idx} className={styles.item}>
                <div className={`card card-interactive ${styles.card}`}>
                  <Icon className={styles.icon} size={32} strokeWidth={1.6} aria-hidden />
                  <h3 className={styles.title}>{item.title}</h3>
                  <p className={styles.description}>{item.proof}</p>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
