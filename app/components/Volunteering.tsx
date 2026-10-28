import Image from 'next/image';
import { useTranslations } from 'next-intl';
import styles from './Volunteering.module.css';
import peaceLogo from '../assets/peace-circuit.webp';
import Reveal from './motion/Reveal';

export default function Volunteering() {
  const t = useTranslations('volunteering');

  return (
    <section id="volunteering" className="section" aria-labelledby="volunteering-title">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow" data-index="07">{t('eyebrow')}</p>
          <h2 id="volunteering-title" className="section-title">
            {t('title')}
          </h2>
        </Reveal>

        <Reveal className={`card ${styles.card}`}>
          <Image
            src={peaceLogo}
            alt={t('logoAlt')}
            className={styles.logo}
            width={72}
            height={72}
            sizes="72px"
            placeholder="blur"
          />
          <div>
            <h3 className={styles.orgName}>{t('org')}</h3>
            <p className={styles.orgField}>{t('roles')}</p>
            <p className={styles.text}>{t('text')}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
