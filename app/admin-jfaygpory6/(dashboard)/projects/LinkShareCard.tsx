'use client';

import { useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Copy, MessageCircle, X } from 'lucide-react';
import { explainEmailProblem } from './emailProblem';
import styles from './linkShareCard.module.css';

/**
 * Shown right after an invitation or proposal link is created. When the email
 * went out it is a short confirmation; when it did not, it explains why in
 * plain words and puts the link (only available now) front and centre.
 */
export default function LinkShareCard({
  what,
  email,
  url,
  delivery,
  validity,
  onDismiss,
}: {
  /** "Invitation", "Proposal", … */
  what: string;
  email: string;
  url: string;
  delivery: { sent: boolean; error?: string };
  /** e.g. "works once and expires in 7 days" */
  validity: string;
  onDismiss?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const problem = delivery.sent ? null : explainEmailProblem(delivery.error);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable: the field is selectable.
    }
  };

  return (
    <div className={styles.card} data-tone={delivery.sent ? 'ok' : 'warn'} role="status">
      <div className={styles.head}>
        <span className={styles.icon} aria-hidden="true">
          {delivery.sent ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        </span>
        <div className={styles.headText}>
          <p className={styles.title}>
            {delivery.sent ? `${what} emailed to ${email}` : `${what} created, but the email wasn’t sent`}
          </p>
          {problem && (
            <p className={styles.text}>
              {problem.reason} Send the link to <strong>{email}</strong> yourself for now.
            </p>
          )}
        </div>
        {onDismiss && (
          <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss">
            <X size={15} />
          </button>
        )}
      </div>

      <div className={styles.linkRow}>
        <input
          className={styles.link}
          readOnly
          value={url}
          aria-label={`${what} link`}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button type="button" className={styles.primary} onClick={copy}>
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <a
          className={styles.secondary}
          href={`https://wa.me/?text=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={15} aria-hidden="true" />
          WhatsApp
        </a>
      </div>
      <p className={styles.note}>The link {validity}.</p>

      {problem && (
        <details className={styles.details}>
          <summary>How to fix email sending</summary>
          {problem.fix && <p>{problem.fix}</p>}
          <p className={styles.raw}>{delivery.error}</p>
        </details>
      )}
    </div>
  );
}
