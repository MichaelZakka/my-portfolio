import { useMessages, useTranslations } from 'next-intl';
import { Code2, Languages, Gauge, ShoppingBag } from 'lucide-react';
import styles from './Strengths.module.css';
import Reveal from './motion/Reveal';
import { STRENGTHS, type Strength } from '../../data/strengths';
import { contentFrom, localizeStrength } from '../lib/localizedContent';

const ICONS: Record<Strength['id'], typeof Code2> = {
  nextjs: Code2,
  rtl: Languages,
  performance: Gauge,
  shopify: ShoppingBag,
};

export default function Strengths() {
  const t = useTranslations('strengths');
  const content = contentFrom(useMessages());

  return (
    <section id="strengths" className="section" aria-labelledby="strengths-title">
      <div className="container">
        <Reveal className="section-head center">
          <p className="eyebrow" data-index="02">{t('eyebrow')}</p>
          <h2 id="strengths-title" className="section-title">
            {t('title')}
          </h2>
          <span className="accent-bar" aria-hidden="true" />
        </Reveal>
        <ul className={styles.grid}>
          {STRENGTHS.map((raw, idx) => {
            const item = localizeStrength(raw, content);
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
