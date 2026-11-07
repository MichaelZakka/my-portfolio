import Link from 'next/link';
import { getPortalTranslations } from '../../lib/portal/locale';
import styles from '../portal.module.css';

/** Rendered (with HTTP 403) when a client opens a project they are not a member of. */
export default async function PortalForbidden() {
  const { t } = await getPortalTranslations('portal.forbidden');
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
