import { getPortalTranslations } from '../../../lib/portal/locale';
import styles from '../../portal.module.css';

export default async function ProjectsLoading() {
  const { t } = await getPortalTranslations('portal.common');
  return (
    <div aria-busy="true">
      <p className="visually-hidden" role="status">
        {t('loading')}
      </p>
      <div className={`${styles.skeleton}`} style={{ height: 36, width: 'min(320px, 70%)', marginBlockEnd: 12 }} />
      <div className={`${styles.skeleton}`} style={{ height: 18, width: 'min(420px, 90%)', marginBlockEnd: 32 }} />
      <div className={styles.projectGrid}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${styles.card} ${styles.skeleton}`} style={{ height: 210 }} />
        ))}
      </div>
    </div>
  );
}
