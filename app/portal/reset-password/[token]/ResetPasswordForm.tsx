'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PASSWORD_MIN_LENGTH } from '../../../lib/portal/constants';
import { jsonRequest, readJson, useErrorMessage, type ApiErrorBody } from '../../_components/useErrorMessage';
import styles from '../../portal.module.css';

export default function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations('portal.auth');
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirm) {
      setError(errorMessage({ code: 'passwordMismatch' }));
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/portal/auth/reset-password', jsonRequest('POST', { token, password }));
      const body = await readJson<ApiErrorBody & { redirectTo?: string }>(response);
      if (!response.ok) {
        setError(errorMessage(body, { min: PASSWORD_MIN_LENGTH }));
        return;
      }
      router.replace(body?.redirectTo ?? '/portal');
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
        <label className={styles.label} htmlFor="reset-password">
          {t('newPassword')}
        </label>
        <input
          id="reset-password"
          className={styles.input}
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          aria-describedby="reset-password-hint"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span id="reset-password-hint" className={styles.hint}>
          {t('passwordHint', { min: PASSWORD_MIN_LENGTH })}
        </span>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="reset-confirm">
          {t('confirmPassword')}
        </label>
        <input
          id="reset-confirm"
          className={styles.input}
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={submitting} aria-busy={submitting}>
        {submitting ? t('savingPassword') : t('savePassword')}
      </button>
    </form>
  );
}
