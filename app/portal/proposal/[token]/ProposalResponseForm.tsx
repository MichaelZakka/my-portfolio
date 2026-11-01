'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PASSWORD_MIN_LENGTH } from '../../../lib/portal/constants';
import { jsonRequest, readJson, useErrorMessage, type ApiErrorBody } from '../../_components/useErrorMessage';
import styles from '../../portal.module.css';
import proposalStyles from '../../_components/proposal.module.css';

type Mode = 'accept' | 'changes' | 'decline';

type Props = {
  token: string;
  email: string;
  defaultName: string;
  /** Existing portal accounts confirm with their password instead of creating one. */
  hasAccount: boolean;
  /** False once the proposal expired: the client can still ask for changes or decline. */
  canAccept: boolean;
};

export default function ProposalResponseForm({ token, email, defaultName, hasAccount, canAccept }: Props) {
  const t = useTranslations('portal.proposal');
  const tAuth = useTranslations('portal.auth');
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(canAccept ? 'accept' : 'changes');
  const [signerName, setSignerName] = useState(defaultName);
  const [agree, setAgree] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<'changes' | 'decline' | null>(null);

  if (done) {
    return (
      <p className={`${styles.alert} ${styles.alertSuccess}`} role="status">
        {done === 'changes' ? t('changesSent') : t('declineSent')}
      </p>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError('');
    if (mode === 'accept' && !hasAccount && password !== confirm) {
      setError(errorMessage({ code: 'passwordMismatch' }));
      return;
    }
    setSubmitting(true);
    try {
      const body =
        mode === 'accept' ? { action: 'accept', token, signerName, agree, password } : { action: mode, token, note };
      const response = await fetch('/api/portal/proposals/respond', jsonRequest('POST', body));
      const result = await readJson<ApiErrorBody & { redirectTo?: string }>(response);
      if (!response.ok) {
        setError(errorMessage(result, { min: PASSWORD_MIN_LENGTH }));
        return;
      }
      if (mode === 'accept') {
        router.replace(result?.redirectTo ?? '/portal');
        router.refresh();
        return;
      }
      setDone(mode);
    } catch {
      setError(errorMessage({ code: 'network' }));
    } finally {
      setSubmitting(false);
    }
  };

  const modes: Mode[] = canAccept ? ['accept', 'changes', 'decline'] : ['changes', 'decline'];
  const modeLabel = { accept: t('actionAccept'), changes: t('actionChanges'), decline: t('actionDecline') };

  return (
    <>
      <div className={proposalStyles.actions} role="group" aria-label={t('chooseAction')}>
        {modes.map((value) => (
          <button
            key={value}
            type="button"
            className={proposalStyles.actionButton}
            aria-pressed={mode === value}
            onClick={() => {
              setMode(value);
              setError('');
            }}
          >
            {modeLabel[value]}
          </button>
        ))}
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <p className={`${styles.alert} ${styles.alertError}`} role="alert">
          {error}
        </p>

        {mode === 'accept' && (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="proposal-email">
                {t('email')}
              </label>
              <input id="proposal-email" className={styles.input} type="email" dir="ltr" value={email} readOnly autoComplete="username" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="proposal-signer">
                {t('signerName')}
              </label>
              <input
                id="proposal-signer"
                className={styles.input}
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </div>
            <p className={`${styles.alert} ${styles.alertInfo}`}>
              {hasAccount ? t('existingAccountHint') : t('newAccountHint')}
            </p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="proposal-password">
                {hasAccount ? t('yourPassword') : t('createPassword')}
              </label>
              <input
                id="proposal-password"
                className={styles.input}
                type="password"
                autoComplete={hasAccount ? 'current-password' : 'new-password'}
                required
                minLength={hasAccount ? undefined : PASSWORD_MIN_LENGTH}
                aria-describedby={hasAccount ? undefined : 'proposal-password-hint'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {!hasAccount && (
                <span id="proposal-password-hint" className={styles.hint}>
                  {tAuth('passwordHint', { min: PASSWORD_MIN_LENGTH })}
                </span>
              )}
            </div>
            {!hasAccount && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="proposal-confirm">
                  {t('confirmPassword')}
                </label>
                <input
                  id="proposal-confirm"
                  className={styles.input}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            )}
            <label className={proposalStyles.checkbox}>
              <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>{t('agree')}</span>
            </label>
          </>
        )}

        {mode !== 'accept' && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="proposal-note">
              {mode === 'changes' ? t('changesLabel') : t('declineLabel')}
            </label>
            <textarea
              id="proposal-note"
              className={styles.textarea}
              dir="auto"
              required={mode === 'changes'}
              maxLength={3000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}

        <button type="submit" className={`btn btn-primary ${styles.submit}`} aria-disabled={submitting} aria-busy={submitting}>
          {submitting
            ? mode === 'accept'
              ? t('accepting')
              : t('sending')
            : { accept: t('acceptSubmit'), changes: t('changesSubmit'), decline: t('declineSubmit') }[mode]}
        </button>
      </form>
    </>
  );
}
