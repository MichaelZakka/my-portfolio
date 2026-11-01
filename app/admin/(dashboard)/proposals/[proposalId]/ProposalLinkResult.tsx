'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import styles from '../../../admin.module.css';
import projectStyles from '../../projects/projects.module.css';

export type SendResult = { proposalUrl: string; email: { sent: boolean; error?: string }; resent: boolean };

/**
 * Shown right after sending. Like invitations, only the link's hash is stored,
 * so this is the one chance to copy it when the email did not go out.
 */
export default function ProposalLinkResult({ result, recipient }: { result: SendResult; recipient: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.proposalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable: the field below is selectable.
    }
  };

  return (
    <div className={result.email.sent ? styles.bannerSuccess : styles.bannerError} role="status">
      {result.email.sent ? (
        <>
          {result.resent ? 'A new link was emailed' : 'Proposal emailed'} to {recipient}. Older links to this version
          no longer work.
        </>
      ) : (
        <>
          The proposal is sent, but the email to {recipient} failed: {result.email.error}
          <br />
          Share this link with the client yourself:
        </>
      )}
      <div className={projectStyles.linkBox}>
        <input
          className={styles.input}
          readOnly
          value={result.proposalUrl}
          aria-label="Proposal link"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={copy}>
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
