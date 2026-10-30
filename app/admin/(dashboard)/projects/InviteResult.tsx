'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import styles from '../../admin.module.css';
import projectStyles from './projects.module.css';

export type InviteOutcome = {
  email: string;
  inviteUrl: string;
  delivery: { sent: boolean; error?: string };
};

/**
 * Shown right after an invitation is created or resent. The link is only
 * available now (just its hash is stored), so when email fails the admin can
 * still share it by hand.
 */
export default function InviteResult({ outcome, onDismiss }: { outcome: InviteOutcome; onDismiss?: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(outcome.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable: the field below is selectable.
    }
  };

  return (
    <div className={outcome.delivery.sent ? styles.bannerSuccess : styles.bannerError} role="status">
      {outcome.delivery.sent ? (
        <>Invitation emailed to {outcome.email}.</>
      ) : (
        <>
          Invitation created, but the email to {outcome.email} was not sent: {outcome.delivery.error}
          <br />
          Share this link with the client yourself (it works once and expires in 7 days):
        </>
      )}
      <div className={projectStyles.linkBox}>
        <input
          className={styles.input}
          readOnly
          value={outcome.inviteUrl}
          aria-label="Invitation link"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={copy}>
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
        {onDismiss && (
          <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
