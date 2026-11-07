'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { reportBrowserError } from '../components/reportBrowserError';
import styles from './portal.module.css';

/** Any portal screen that crashes: a calm message in the client's language, and the admin hears about it. */
export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('portal.errorPage');

  useEffect(() => {
    reportBrowserError(error);
  }, [error]);

  return (
    <main className={styles.authPage}>
      <div className={styles.authCard} role="alert">
        <h1 className={styles.authTitle}>{t('title')}</h1>
        <p className={styles.authSubtitle}>{t('text')}</p>
        <div className={styles.form}>
          <button type="button" className={`btn btn-primary ${styles.submit}`} onClick={reset}>
            {t('retry')}
          </button>
          <Link href="/portal" className={`btn btn-outline ${styles.submit}`}>
            {t('home')}
          </Link>
        </div>
      </div>
    </main>
  );
}
