import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPortalTranslations } from '../../lib/portal/locale';
import { getPortalUser } from '../../lib/portal/session';
import LanguageSwitch from '../_components/LanguageSwitch';
import SignOutButton from '../_components/SignOutButton';
import styles from '../portal.module.css';

/** Signed-in shell. Pages repeat the session check: layouts and pages render in parallel. */
export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const user = await getPortalUser();
  if (!user) redirect('/portal/login?expired=1');

  const { t } = await getPortalTranslations('portal.common');

  return (
    <div className={styles.page}>
      <a href="#portal-main" className="skip-link">
        {t('skipToContent')}
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/portal" className={styles.brand}>
            <span className={styles.brandName}>{t('brand')}</span>
            <span className={styles.brandSub}>{t('portalName')}</span>
          </Link>
          <nav aria-label={t('primaryNav')} className={styles.headerNav}>
            <Link href="/portal" className={styles.navLink}>
              {t('projects')}
            </Link>
          </nav>
          <div className={styles.headerActions}>
            <span className={styles.userEmail} dir="ltr" title={t('signedInAs', { email: user.email })}>
              {user.email}
            </span>
            <LanguageSwitch />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main id="portal-main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
    </div>
  );
}
