import { getPortalTranslations } from '../../../../lib/portal/locale';
import styles from '../../../portal.module.css';

export default async function ProjectLoading() {
  const { t } = await getPortalTranslations('portal.common');
  const block = (height: number, width = '100%') => (
    <div className={styles.skeleton} style={{ height, width }} />
  );
  return (
    <div aria-busy="true">
      <p className="visually-hidden" role="status">
        {t('loading')}
      </p>
      <div style={{ display: 'grid', gap: 12, marginBlockEnd: 24 }}>
        {block(18, '120px')}
        {block(36, 'min(420px, 80%)')}
        {block(16, 'min(560px, 95%)')}
      </div>
      <div className={`${styles.card} ${styles.skeleton}`} style={{ height: 120, marginBlockEnd: 24 }} />
      <div className={styles.projectLayout}>
        <div className={styles.stack}>
          <div className={`${styles.card} ${styles.skeleton}`} style={{ height: 320 }} />
          <div className={`${styles.card} ${styles.skeleton}`} style={{ height: 260 }} />
        </div>
        <div className={styles.stack}>
          <div className={`${styles.card} ${styles.skeleton}`} style={{ height: 220 }} />
          <div className={`${styles.card} ${styles.skeleton}`} style={{ height: 260 }} />
        </div>
      </div>
    </div>
  );
}
