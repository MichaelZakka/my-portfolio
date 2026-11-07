import Link from 'next/link';
import { getPortalTranslations } from '../../lib/portal/locale';
import styles from '../portal.module.css';

export default async function PortalNotFound() {
  const { t } = await getPortalTranslations('portal.notFound');
  return (
    <div className={styles.statePanel}>
      <h1>{t('title')}</h1>
      <p>{t('text')}</p>
      <Link href="/portal" className="btn btn-primary">
        {t('back')}
      </Link>
    </div>
  );
}
