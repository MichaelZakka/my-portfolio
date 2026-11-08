import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPortalTranslations } from '../../lib/portal/locale';
import { getPortalUser, isPortalAuthConfigured } from '../../lib/portal/session';
import { localizedPath } from '../../../i18n/paths';
import AuthCard from '../_components/AuthCard';
import LoginForm from './LoginForm';
import styles from '../portal.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getPortalTranslations('portal.meta');
  return { title: t('signIn') };
}

type Props = { searchParams: Promise<{ from?: string; expired?: string }> };

export default async function PortalLoginPage({ searchParams }: Props) {
  if (await getPortalUser()) redirect('/portal');

  const { from, expired } = await searchParams;
  const { t, locale } = await getPortalTranslations('portal.auth');
  const configured = isPortalAuthConfigured();

  return (
    <AuthCard title={t('signInTitle')} subtitle={t('signInSubtitle')}>
      {!configured && (
        <p className={`${styles.alert} ${styles.alertError}`} role="alert">
          {t('notConfigured')}
        </p>
      )}
      {configured && expired && (
        <p className={`${styles.alert} ${styles.alertInfo}`} role="status" style={{ marginBlockEnd: 16 }}>
          {t('sessionExpired')}
        </p>
      )}
      {configured && <LoginForm from={from} />}
      {configured && (
        <p className={styles.authNote}>
          {t.rich('invitationOnly', {
            link: (chunks) => (
              <a href={localizedPath(locale, '/work-with-me')} className={styles.textLink}>
                {chunks}
              </a>
            ),
          })}
        </p>
      )}
    </AuthCard>
  );
}
