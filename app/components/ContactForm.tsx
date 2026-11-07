'use client';

import { useActionState, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import styles from './Contact.module.css';
import { submitContact, type ContactState } from '../actions/contact';
import { CONTACT_LIMITS, validateContact, type ContactErrors } from '../lib/contact';
import { trackEvent } from '../lib/analyticsClient';

const INITIAL: ContactState = { status: 'idle' };

export default function ContactForm() {
  const t = useTranslations('contact');
  const [state, formAction, pending] = useActionState(submitContact, INITIAL);
  const [clientErrors, setClientErrors] = useState<ContactErrors>({});

  const serverErrors = state.status === 'error' ? state.fieldErrors ?? {} : {};
  const errors = { ...serverErrors, ...clientErrors };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const data = new FormData(e.currentTarget);
    const found = validateContact({
      name: String(data.get('name') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      message: String(data.get('message') ?? '').trim(),
    });
    setClientErrors(found);
    if (Object.keys(found).length > 0) {
      e.preventDefault();
      return;
    }
    trackEvent('cta_click', { label: 'contact-submit' });
  };

  if (state.status === 'success') {
    return (
      <div className={`card ${styles.formCard} ${styles.success}`} role="status">
        <CheckCircle2 size={32} aria-hidden className={styles.successIcon} />
        <h3 className={styles.formTitle}>{t('form.successTitle')}</h3>
        <p className={styles.formHint}>{t('form.successText')}</p>
      </div>
    );
  }

  const fieldProps = (name: keyof ContactErrors) => ({
    id: `contact-${name}`,
    name,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `contact-${name}-error` : undefined,
  });

  return (
    <form className={`card ${styles.formCard}`} action={formAction} onSubmit={onSubmit} noValidate>
      <h3 className={styles.formTitle}>{t('form.title')}</h3>

      <div className={styles.formRow}>
        <label htmlFor="contact-name">{t('form.name')}</label>
        <input
          {...fieldProps('name')}
          className={styles.field}
          type="text"
          autoComplete="name"
          required
          minLength={CONTACT_LIMITS.name.min}
          maxLength={CONTACT_LIMITS.name.max}
        />
        {errors.name && (
          <p id="contact-name-error" className={styles.fieldError}>
            {t(`errors.${errors.name}`)}
          </p>
        )}
      </div>

      <div className={styles.formRow}>
        <label htmlFor="contact-email">{t('form.email')}</label>
        <input
          {...fieldProps('email')}
          className={styles.field}
          type="email"
          autoComplete="email"
          required
          maxLength={CONTACT_LIMITS.email.max}
          dir="ltr"
        />
        {errors.email && (
          <p id="contact-email-error" className={styles.fieldError}>
            {t(`errors.${errors.email}`)}
          </p>
        )}
      </div>

      <div className={styles.formRow}>
        <label htmlFor="contact-message">{t('form.message')}</label>
        <textarea
          {...fieldProps('message')}
          className={`${styles.field} ${styles.textarea}`}
          rows={5}
          required
          minLength={CONTACT_LIMITS.message.min}
          maxLength={CONTACT_LIMITS.message.max}
        />
        {errors.message && (
          <p id="contact-message-error" className={styles.fieldError}>
            {t(`errors.${errors.message}`)}
          </p>
        )}
      </div>

      {/* Honeypot: hidden from people and assistive tech */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input id="contact-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <p className={styles.formStatus} role="alert">
        {state.status === 'error' && Object.keys(clientErrors).length === 0
          ? t(`errors.${state.message}`)
          : ''}
      </p>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? (
          <Loader2 size={18} aria-hidden className={styles.spin} />
        ) : (
          <Send size={18} aria-hidden className="flip-rtl" />
        )}
        {pending ? t('form.sending') : t('form.send')}
      </button>
    </form>
  );
}
