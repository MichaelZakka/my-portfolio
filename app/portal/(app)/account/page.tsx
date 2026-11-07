import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '../../../lib/db';
import { formatDateTime } from '../../../lib/portal/format';
import { getPortalTranslations } from '../../../lib/portal/locale';
import { getPortalUser } from '../../../lib/portal/session';
import AccountForms from './AccountForms';
import styles from '../../portal.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getPortalTranslations('portal.meta');
  return { title: t('account') };
}

/** The client's own settings: name, language, password, and signing out other devices. */
export default async function AccountPage() {
  const user = await getPortalUser();
  if (!user) redirect('/portal/login?expired=1');

  const { t, locale } = await getPortalTranslations('portal.account');
  const details = await prisma.user.findUnique({ where: { id: user.id }, select: { lastLoginAt: true } });

  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{t('title')}</h1>
        <p className={styles.pageSubtitle}>{t('subtitle')}</p>
      </div>
      <AccountForms
        name={user.name}
        email={user.email}
        locale={locale}
        timeZone={user.timeZone}
        lastSignIn={details?.lastLoginAt ? formatDateTime(details.lastLoginAt, locale, user.timeZone) : null}
      />
    </>
  );
}
