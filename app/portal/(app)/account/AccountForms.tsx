'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PASSWORD_MIN_LENGTH, type PortalLocale } from '../../../lib/portal/constants';
import { jsonRequest, readJson, useErrorMessage, type ApiErrorBody } from '../../_components/useErrorMessage';
import styles from '../../portal.module.css';

type Status = { kind: 'error' | 'success'; text: string } | null;

function StatusLine({ status }: { status: Status }) {
  return (
    <p
      className={`${styles.alert} ${status?.kind === 'success' ? styles.alertSuccess : styles.alertError}`}
      role={status?.kind === 'error' ? 'alert' : 'status'}
    >
      {status?.text ?? ''}
    </p>
  );
}

export default function AccountForms({
  name: initialName,
  email,
  locale,
  timeZone,
  lastSignIn,
}: {
  name: string;
  email: string;
  locale: PortalLocale;
  timeZone: string;
  lastSignIn: string | null;
}) {
  const t = useTranslations('portal.account');
  const tAuth = useTranslations('portal.auth');
  const errorMessage = useErrorMessage();
  const [busy, setBusy] = useState<string | null>(null);

  const [name, setName] = useState(initialName);
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [language, setLanguage] = useState<PortalLocale>(locale);
  const [languageStatus, setLanguageStatus] = useState<Status>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  const [sessionsStatus, setSessionsStatus] = useState<Status>(null);

  /** Runs one form's request; returns true on success, otherwise shows the localized error. */
  const submit = async (key: string, url: string, init: RequestInit, show: (status: Status) => void) => {
    if (busy) return false;
    setBusy(key);
    show(null);
    try {
      const response = await fetch(url, init);
      if (!response.ok) {
        show({ kind: 'error', text: errorMessage(await readJson<ApiErrorBody>(response), { min: PASSWORD_MIN_LENGTH }) });
        return false;
      }
      return true;
    } catch {
      show({ kind: 'error', text: errorMessage({ code: 'network' }) });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (await submit('profile', '/api/portal/account', jsonRequest('PATCH', { name }), setProfileStatus)) {
      setProfileStatus({ kind: 'success', text: t('saved') });
    }
  };

  const saveLanguage = async (event: FormEvent) => {
    event.preventDefault();
    if (await submit('language', '/api/portal/locale', jsonRequest('POST', { locale: language }), setLanguageStatus)) {
      // The whole portal (and its direction) changes: load it again in the new language.
      window.location.reload();
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (next !== confirm) {
      setPasswordStatus({ kind: 'error', text: errorMessage({ code: 'passwordMismatch' }) });
      return;
    }
    const body = { currentPassword: current, newPassword: next };
    if (await submit('password', '/api/portal/account/password', jsonRequest('POST', body), setPasswordStatus)) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setPasswordStatus({ kind: 'success', text: t('passwordChanged') });
    }
  };

  const signOutOthers = async () => {
    if (await submit('sessions', '/api/portal/account/sessions', jsonRequest('POST', {}), setSessionsStatus)) {
      setSessionsStatus({ kind: 'success', text: t('signedOutOthers') });
    }
  };

  return (
    <div className={styles.stack}>
      <form className={`${styles.card} ${styles.form}`} onSubmit={saveProfile} aria-labelledby="account-profile">
        <h2 id="account-profile" className={styles.sectionTitle}>
          {t('profileTitle')}
        </h2>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="account-name">
            {t('name')}
          </label>
          <input
            id="account-name"
            className={styles.input}
            autoComplete="name"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="account-email">
            {t('email')}
          </label>
          <input id="account-email" className={styles.input} type="email" dir="ltr" value={email} readOnly />
          <span className={styles.hint}>{t('emailHint')}</span>
        </div>
        <StatusLine status={profileStatus} />
        <button type="submit" className="btn btn-primary" aria-disabled={busy !== null} aria-busy={busy === 'profile'}>
          {busy === 'profile' ? t('saving') : t('save')}
        </button>
      </form>

      <form className={`${styles.card} ${styles.form}`} onSubmit={saveLanguage} aria-labelledby="account-language">
        <h2 id="account-language" className={styles.sectionTitle}>
          {t('languageTitle')}
        </h2>
        <fieldset className={styles.field} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className={styles.hint}>{t('languageHint')}</legend>
          {(['en', 'ar'] as const).map((value) => (
            <label key={value} className={`${styles.label} ${styles.choice}`}>
              <input
                type="radio"
                name="account-language"
                value={value}
                checked={language === value}
                onChange={() => setLanguage(value)}
              />
              <span lang={value} dir={value === 'ar' ? 'rtl' : 'ltr'}>
                {value === 'ar' ? 'العربية' : 'English'}
              </span>
            </label>
          ))}
        </fieldset>
        <p className={styles.hint}>{t('timeZone', { zone: timeZone })}</p>
        <StatusLine status={languageStatus} />
        <button
          type="submit"
          className="btn btn-primary"
          aria-disabled={busy !== null || language === locale}
          aria-busy={busy === 'language'}
        >
          {busy === 'language' ? t('saving') : t('save')}
        </button>
      </form>

      <form className={`${styles.card} ${styles.form}`} onSubmit={changePassword} aria-labelledby="account-password">
        <h2 id="account-password" className={styles.sectionTitle}>
          {t('passwordTitle')}
        </h2>
        {/* For password managers: the account the password belongs to. */}
        <input type="email" value={email} autoComplete="username" readOnly hidden />
        <div className={styles.field}>
          <label className={styles.label} htmlFor="account-current">
            {t('currentPassword')}
          </label>
          <input
            id="account-current"
            className={styles.input}
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="account-new">
            {t('newPassword')}
          </label>
          <input
            id="account-new"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            aria-describedby="account-new-hint"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <span id="account-new-hint" className={styles.hint}>
            {tAuth('passwordHint', { min: PASSWORD_MIN_LENGTH })} {t('passwordSignsOut')}
          </span>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="account-confirm">
            {t('confirmPassword')}
          </label>
          <input
            id="account-confirm"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <StatusLine status={passwordStatus} />
        <button type="submit" className="btn btn-primary" aria-disabled={busy !== null} aria-busy={busy === 'password'}>
          {busy === 'password' ? t('saving') : t('changePassword')}
        </button>
      </form>

      <section className={`${styles.card} ${styles.form}`} aria-labelledby="account-devices">
        <h2 id="account-devices" className={styles.sectionTitle}>
          {t('devicesTitle')}
        </h2>
        <p className={styles.muted}>{lastSignIn ? t('lastSignIn', { date: lastSignIn }) : t('devicesHint')}</p>
        <StatusLine status={sessionsStatus} />
        <button
          type="button"
          className="btn btn-outline"
          onClick={signOutOthers}
          aria-disabled={busy !== null}
          aria-busy={busy === 'sessions'}
        >
          {busy === 'sessions' ? t('saving') : t('signOutOthers')}
        </button>
      </section>
    </div>
  );
}
