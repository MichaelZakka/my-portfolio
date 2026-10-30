'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { jsonRequest, readJson, useErrorMessage, type ApiErrorBody } from '../_components/useErrorMessage';
import styles from '../portal.module.css';

/** Only same-site portal paths are accepted as a post-login destination (no open redirect). */
function safeDestination(from: string | undefined): string {
  if (from && /^\/portal(\/|$)/.test(from) && !from.startsWith('//')) return from;
  return '/portal';
}

export default function LoginForm({ from }: { from?: string }) {
  const t = useTranslations('portal.auth');
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/portal/auth/login', jsonRequest('POST', { email, password }));
      if (!response.ok) {
        setError(errorMessage(await readJson<ApiErrorBody>(response)));
        return;
      }
      router.replace(safeDestination(from));
      router.refresh();
    } catch {
      setError(errorMessage({ code: 'network' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={`${styles.alert} ${styles.alertError}`} role="alert">
        {error}
      </p>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="portal-email">
          {t('email')}
        </label>
        <input
          id="portal-email"
          className={styles.input}
          type="email"
          dir="ltr"
          autoComplete="username"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="portal-password">
          {t('password')}
        </label>
        <input
          id="portal-password"
          className={styles.input}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
      </div>
      <button type="submit" className={`btn btn-primary ${styles.submit}`} aria-disabled={submitting} aria-busy={submitting}>
        {submitting ? t('signingIn') : t('signIn')}
      </button>
      <p className={styles.authFooter}>
        <Link href="/portal/forgot-password" className={styles.textLink}>
          {t('forgotLink')}
        </Link>
      </p>
    </form>
  );
}
