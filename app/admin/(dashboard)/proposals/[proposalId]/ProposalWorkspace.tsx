'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, FilePlus2, FolderKanban, RefreshCw } from 'lucide-react';
import type { ProposalState } from '../../../../lib/portal/constants';
import { jsonInit, useAdminAction } from '../../projects/useAdminAction';
import ProposalEditor, { type ProposalDraft } from './ProposalEditor';
import ProposalLinkResult, { type SendResult } from './ProposalLinkResult';
import styles from '../../../admin.module.css';
import projectStyles from '../../projects/projects.module.css';
import { confirmDialog } from '../../../../components/confirmDialog';

export type ProposalFacts = {
  recipient: string;
  total: string;
  sent: string | null;
  validUntil: string | null;
  email: { sent: boolean; error: string | null } | null;
  responded: string | null;
  responseNote: string | null;
  signer: { name: string; ip: string; userAgent: string; hash: string } | null;
};

/**
 * One component for the whole lifecycle, so the link shown after sending
 * survives the page refresh that turns the editor into the read-only summary.
 */
export default function ProposalWorkspace({
  proposalId,
  leadId,
  version,
  state,
  draft,
  facts,
  hints,
  projectId,
  newerVersion,
}: {
  proposalId: string;
  leadId: string;
  version: number;
  state: ProposalState;
  draft: ProposalDraft;
  facts: ProposalFacts;
  hints: { budget: string; timeline: string };
  projectId: string | null;
  newerVersion: { id: string; version: number } | null;
}) {
  const router = useRouter();
  const { run, pending, error } = useAdminAction();
  const [sent, setSent] = useState<SendResult | null>(null);

  const canResend = (state === 'sent' || state === 'expired') && !projectId;
  const canRevise = !newerVersion && !projectId && state !== 'draft' && state !== 'accepted';

  const resend = async () => {
    const question = `Email ${facts.recipient} a new link? The current link stops working and the validity period restarts.`;
    if (pending || !(await confirmDialog({ title: 'Email a new link?', message: question, confirmLabel: 'Send new link' }))) return;
    const result = await run<SendResult>('resend', `/api/admin/proposals/${proposalId}/send`, jsonInit('POST'));
    if (result) setSent(result);
  };

  const revise = async () => {
    const result = await run<{ proposalId: string }>('revise', `/api/admin/requests/${leadId}/proposals`, jsonInit('POST'));
    if (result) router.push(`/admin/proposals/${result.proposalId}`);
  };

  const field = (label: string, value: React.ReactNode, wide = false) => (
    <div className={styles.detailField} style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );

  return (
    <>
      {sent && <ProposalLinkResult result={sent} recipient={facts.recipient} />}
      {newerVersion && (
        <div className={styles.bannerSuccess}>
          Version {newerVersion.version} is newer.{' '}
          <Link href={`/admin/proposals/${newerVersion.id}`} className={styles.link}>
            Open version {newerVersion.version}
          </Link>
        </div>
      )}

      {state === 'draft' && !sent ? (
        <ProposalEditor
          proposalId={proposalId}
          leadId={leadId}
          version={version}
          recipient={facts.recipient}
          hints={hints}
          initial={draft}
          onSent={setSent}
        />
      ) : (
        <>
          {error && (
            <div className={styles.bannerError} role="alert">
              {error}
            </div>
          )}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Status</span>
            </div>
            <div className={styles.detailGrid}>
              {field('Sent to', facts.recipient)}
              {field('Total', facts.total)}
              {field('Sent', facts.sent ?? '—')}
              {field('Valid until', facts.validUntil ?? '—')}
              {facts.email &&
                field(
                  'Email',
                  facts.email.sent ? (
                    'Delivered to Resend ✓'
                  ) : (
                    <span className={projectStyles.errorText}>Not sent: {facts.email.error}</span>
                  )
                )}
              {facts.responded && field('Answered', facts.responded)}
              {facts.responseNote &&
                field(
                  state === 'declined' ? 'Reason given' : 'Requested changes',
                  <span dir="auto" style={{ whiteSpace: 'pre-line' }}>
                    {facts.responseNote}
                  </span>,
                  true
                )}
            </div>
          </div>

          {facts.signer && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Acceptance record</span>
                <span className={styles.cardMeta}>A frozen copy of what was accepted is stored with this version.</span>
              </div>
              <div className={styles.detailGrid}>
                {field('Accepted by', facts.signer.name)}
                {field('IP address', facts.signer.ip || '—')}
                {field('Browser', <span style={{ fontSize: '0.78rem' }}>{facts.signer.userAgent || '—'}</span>, true)}
                {field(
                  'Content fingerprint (SHA-256)',
                  <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{facts.signer.hash}</code>,
                  true
                )}
              </div>
            </div>
          )}

          <div className={styles.card}>
            <div className={projectStyles.formActions} style={{ flexWrap: 'wrap', gap: '0.6rem' }}>
              {projectId && (
                <Link href={`/admin/projects/${projectId}`} className={`${styles.button} ${styles.buttonPrimary}`}>
                  <FolderKanban size={16} aria-hidden="true" />
                  Open project
                </Link>
              )}
              <a
                href={`/admin/proposals/${proposalId}/preview`}
                target="_blank"
                rel="noopener"
                className={`${styles.button} ${styles.buttonSecondary}`}
              >
                <Eye size={16} aria-hidden="true" />
                View as client
              </a>
              {canResend && (
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  onClick={resend}
                  aria-disabled={pending !== null}
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  {pending === 'resend' ? 'Sending…' : 'Email a new link'}
                </button>
              )}
              {canRevise && (
                <button
                  type="button"
                  className={`${styles.button} ${state === 'changes_requested' ? styles.buttonPrimary : styles.buttonSecondary}`}
                  onClick={revise}
                  aria-disabled={pending !== null}
                >
                  <FilePlus2 size={16} aria-hidden="true" />
                  {pending === 'revise' ? 'Opening…' : `Revise as version ${version + 1}`}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
