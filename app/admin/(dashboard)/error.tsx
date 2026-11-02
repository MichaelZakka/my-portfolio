'use client';

import { useEffect } from 'react';
import { reportBrowserError } from '../../components/reportBrowserError';
import styles from '../admin.module.css';

/** A crashed dashboard screen; it is recorded on the Site page (server errors are recorded by instrumentation.ts). */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportBrowserError(error);
  }, [error]);

  return (
    <div className={styles.card} role="alert">
      <div className={styles.bannerError}>
        This screen failed to load{error.digest ? ` (reference ${error.digest})` : ''}. It has been recorded under Site →
        Problems.
      </div>
      <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={reset}>
        Try again
      </button>
    </div>
  );
}
