import { getPortalTranslations } from '../../../../../lib/portal/locale';
import styles from '../../../../portal.module.css';

export default async function ReviewLoading() {
  const { t } = await getPortalTranslations('portal.common');
  const block = (height: number, width = '100%') => <div className={styles.skeleton} style={{ height, width }} />;
  return (
    <div aria-busy="true" style={{ maxWidth: 760 }}>
      <p className="visually-hidden" role="status">
        {t('loading')}
      </p>
      <div style={{ display: 'grid', gap: 12, marginBlockEnd: 24 }}>
        {block(18, '140px')}
        {block(36, 'min(360px, 80%)')}
        {block(16, 'min(520px, 95%)')}
      </div>
      <div className={`${styles.card} ${styles.skeleton}`} style={{ height: 360 }} />
    </div>
  );
}
