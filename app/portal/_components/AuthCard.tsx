import type { ReactNode } from 'react';
import { getPortalTranslations } from '../../lib/portal/locale';
import LanguageSwitch from './LanguageSwitch';
import styles from '../portal.module.css';

/** Centered card for the signed-out pages: sign in, password reset, invitation. */
export default async function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  const { t } = await getPortalTranslations('portal.common');
  return (
    <main className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.authTop}>
          <div className={styles.brand}>
            <span className={styles.brandName}>{t('brand')}</span>
            <span className={styles.brandSub}>{t('portalName')}</span>
          </div>
          <LanguageSwitch />
        </div>
        <h1 className={styles.authTitle}>{title}</h1>
        {subtitle && <p className={styles.authSubtitle}>{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}
