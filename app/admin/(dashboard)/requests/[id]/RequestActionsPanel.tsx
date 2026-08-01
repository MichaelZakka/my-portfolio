'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Mail, MessageCircle, Check } from 'lucide-react';
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from '../../../../lib/leads';
import styles from '../../../admin.module.css';

type RequestActionsPanelProps = {
  leadId: string;
  currentStatus: string;
  currentNotes: string;
  clientEmail: string;
  whatsappUrl: string;
};

export default function RequestActionsPanel({
  leadId,
  currentStatus,
  currentNotes,
  clientEmail,
  whatsappUrl,
}: RequestActionsPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const hasChanges = status !== currentStatus || notes !== currentNotes;

  const handleSave = async () => {
    setIsSaving(true);
    setBanner(null);
    try {
      const response = await fetch(`/api/admin/requests/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setBanner({ type: 'error', message: result.error || 'Could not save changes.' });
        return;
      }
      setBanner({ type: 'success', message: 'Saved.' });
      router.refresh();
    } catch {
      setBanner({ type: 'error', message: 'Network error — please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(clientEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — silently ignore
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Manage request</span>
      </div>

      {banner && (
        <div className={banner.type === 'success' ? styles.bannerSuccess : styles.bannerError}>
          {banner.message}
        </div>
      )}

      <div className={styles.filterField} style={{ marginBottom: '1rem' }}>
        <label className={styles.filterLabel} htmlFor="lead-status">
          Status
        </label>
        <select
          id="lead-status"
          className={styles.select}
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus)}
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterField} style={{ marginBottom: '1rem' }}>
        <label className={styles.filterLabel} htmlFor="lead-notes">
          Admin notes
        </label>
        <textarea
          id="lead-notes"
          className={styles.textarea}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Private notes — not visible to the client…"
        />
      </div>

      <button
        type="button"
        className={`${styles.button} ${styles.buttonPrimary}`}
        onClick={handleSave}
        disabled={isSaving || !hasChanges}
        style={{ width: '100%', marginBottom: '1.25rem' }}
      >
        {isSaving ? 'Saving…' : 'Save changes'}
      </button>

      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Quick actions</span>
      </div>
      <div className={styles.actionsRow} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <a
          href={`mailto:${clientEmail}`}
          className={`${styles.button} ${styles.buttonSecondary}`}
          style={{ justifyContent: 'flex-start' }}
        >
          <Mail size={16} strokeWidth={2} aria-hidden="true" />
          Email {clientEmail}
        </a>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.button} ${styles.buttonSecondary}`}
          style={{ justifyContent: 'flex-start' }}
        >
          <MessageCircle size={16} strokeWidth={2} aria-hidden="true" />
          Open WhatsApp with summary
        </a>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={handleCopyEmail}
          style={{ justifyContent: 'flex-start' }}
        >
          {copied ? (
            <Check size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Copy size={16} strokeWidth={2} aria-hidden="true" />
          )}
          {copied ? 'Copied!' : 'Copy email address'}
        </button>
      </div>
    </div>
  );
}
