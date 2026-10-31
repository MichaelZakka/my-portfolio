'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PASSWORD_RESET_TTL_MINUTES } from '../../lib/portal/constants';
import { jsonRequest, readJson, useErrorMessage, type ApiErrorBody } from '../_components/useErrorMessage';
import styles from '../portal.module.css';

export default function ForgotPasswordForm() {
  const t = useTranslations('portal.auth');
  const errorMessage = useErrorMessage();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/portal/auth/forgot-password', jsonRequest('POST', { email }));
      if (!response.ok) {
        setError(errorMessage(await readJson<ApiErrorBody>(response)));
        return;
      }
      setSentTo(email.trim());
    } catch {
      setError(errorMessage({ code: 'network' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <div className={styles.form}>
        <p className={`${styles.alert} ${styles.alertSuccess}`} role="status">
          {t('forgotSent', { email: sentTo, minutes: PASSWORD_RESET_TTL_MINUTES })}
        </p>
        <p className={styles.authFooter}>
          <Link href="/portal/login" className={styles.textLink}>
            {t('backToSignIn')}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={`${styles.alert} ${styles.alertError}`} role="alert">
        {error}
      </p>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="forgot-email">
          {t('email')}
        </label>
        <input
          id="forgot-email"
          className={styles.input}
          type="email"
          dir="ltr"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button type="submit" className={`btn btn-primary ${styles.submit}`} aria-disabled={submitting} aria-busy={submitting}>
        {submitting ? t('sendingLink') : t('sendLink')}
      </button>
      <p className={styles.authFooter}>
        <Link href="/portal/login" className={styles.textLink}>
          {t('backToSignIn')}
        </Link>
      </p>
    </form>
  );
}
