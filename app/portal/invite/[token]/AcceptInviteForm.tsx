'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PASSWORD_MIN_LENGTH } from '../../../lib/portal/constants';
import { jsonRequest, readJson, useErrorMessage, type ApiErrorBody } from '../../_components/useErrorMessage';
import styles from '../../portal.module.css';

type Props = {
  token: string;
  email: string;
  defaultName: string;
  /** Existing portal accounts confirm with their password instead of creating one. */
  hasAccount: boolean;
};

export default function AcceptInviteForm({ token, email, defaultName, hasAccount }: Props) {
  const t = useTranslations('portal.invite');
  const tAuth = useTranslations('portal.auth');
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError('');
    if (!hasAccount && password !== confirm) {
      setError(errorMessage({ code: 'passwordMismatch' }));
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        '/api/portal/invitations/accept',
        jsonRequest('POST', { token, password, ...(hasAccount ? {} : { name }) })
      );
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
      <p className={`${styles.alert} ${styles.alertInfo}`}>
        {hasAccount ? t('existingAccountHint') : t('newAccountHint')}
      </p>
      <p className={`${styles.alert} ${styles.alertError}`} role="alert">
        {error}
      </p>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="invite-email">
          {t('email')}
        </label>
        <input id="invite-email" className={styles.input} type="email" dir="ltr" value={email} readOnly autoComplete="username" />
      </div>
      {!hasAccount && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="invite-name">
            {t('name')}
          </label>
          <input
            id="invite-name"
            className={styles.input}
            type="text"
            autoComplete="name"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      )}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="invite-password">
          {hasAccount ? t('yourPassword') : t('createPassword')}
        </label>
        <input
          id="invite-password"
          className={styles.input}
          type="password"
          autoComplete={hasAccount ? 'current-password' : 'new-password'}
          required
          minLength={hasAccount ? undefined : PASSWORD_MIN_LENGTH}
          aria-describedby={hasAccount ? undefined : 'invite-password-hint'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {!hasAccount && (
          <span id="invite-password-hint" className={styles.hint}>
            {tAuth('passwordHint', { min: PASSWORD_MIN_LENGTH })}
          </span>
        )}
      </div>
      {!hasAccount && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="invite-confirm">
            {t('confirmPassword')}
          </label>
          <input
            id="invite-confirm"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
      )}
      <button type="submit" className={`btn btn-primary ${styles.submit}`} aria-disabled={submitting} aria-busy={submitting}>
        {submitting ? t('accepting') : t('accept')}
      </button>
    </form>
  );
}
