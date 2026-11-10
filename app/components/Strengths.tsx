import { getLocale, getTranslations } from 'next-intl/server';
import styles from './Strengths.module.css';
import Reveal from './motion/Reveal';
import { getPortfolio } from '../lib/content/portfolio';
import { STRENGTH_ICON_COMPONENTS } from '../lib/content/icons';

export default async function Strengths() {
  const t = await getTranslations('strengths');
  const { strengths } = await getPortfolio(await getLocale());

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
          {strengths.map((item, idx) => {
            const Icon = STRENGTH_ICON_COMPONENTS[item.icon];
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
