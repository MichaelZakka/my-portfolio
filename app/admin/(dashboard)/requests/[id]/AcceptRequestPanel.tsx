'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, FolderKanban, SlidersHorizontal } from 'lucide-react';
import type { PortalLocale } from '../../../../lib/portal/constants';
import InviteResult from '../../projects/InviteResult';
import { jsonInit, useAdminAction } from '../../projects/useAdminAction';
import styles from '../../../admin.module.css';

type AcceptResponse = {
  project: { id: string; name: string };
  invite:
    | { ok: true; inviteUrl: string; email: { sent: boolean; error?: string } }
    | { ok: false; error: string };
};

type AcceptRequestPanelProps = {
  leadId: string;
  clientEmail: string;
  defaultLocale: PortalLocale;
  project: { id: string; name: string } | null;
};

/**
 * Accepting creates the request's project, marks it Won and emails the client
 * a link to join it in the portal. The result stays in state after the page
 * refreshes: the invitation link exists only in this response.
 */
export default function AcceptRequestPanel({ leadId, clientEmail, defaultLocale, project }: AcceptRequestPanelProps) {
  const { run, pending, error } = useAdminAction();
  const [locale, setLocale] = useState<PortalLocale>(defaultLocale);
  const [accepted, setAccepted] = useState<AcceptResponse | null>(null);

  const handleAccept = async () => {
    const result = await run<AcceptResponse>(
      'accept',
      `/api/admin/requests/${leadId}/accept`,
      jsonInit('POST', { locale })
    );
    if (result) setAccepted(result);
  };

  const openProject = (id: string) => (
    <Link
      href={`/admin/projects/${id}`}
      className={`${styles.button} ${accepted ? styles.buttonPrimary : styles.buttonSecondary}`}
      style={{ width: '100%' }}
    >
      <FolderKanban size={16} strokeWidth={2} aria-hidden="true" />
      Open project
    </Link>
  );

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Client project</span>
      </div>

      {accepted ? (
        <>
          <div className={styles.bannerSuccess} role="status">
            Request accepted. Project “{accepted.project.name}” created.
          </div>
          {accepted.invite.ok ? (
            <InviteResult
              outcome={{ email: clientEmail, inviteUrl: accepted.invite.inviteUrl, delivery: accepted.invite.email }}
            />
          ) : (
            <div className={styles.bannerError}>
              The client was not invited: {accepted.invite.error} Invite them from the project page.
            </div>
          )}
          {openProject(accepted.project.id)}
        </>
      ) : project ? (
        <>
          <p className={styles.pageSubtitle} style={{ marginBottom: '0.75rem' }}>
            Converted to “{project.name}”.
          </p>
          {openProject(project.id)}
        </>
      ) : (
        <>
          {error && (
            <div className={styles.bannerError} role="alert">
              {error}
            </div>
          )}
          <p className={styles.pageSubtitle} style={{ marginBottom: '0.75rem' }}>
            Accepting creates a project from this brief, marks the request Won and emails {clientEmail} that it
            was accepted, with a link to join the project in the client portal.
          </p>
          <div className={styles.filterField} style={{ marginBottom: '1rem' }}>
            <label className={styles.filterLabel} htmlFor="accept-locale">
              Email language
            </label>
            <select
              id="accept-locale"
              className={styles.select}
              value={locale}
              onChange={(e) => setLocale(e.target.value as PortalLocale)}
            >
              <option value="en">English</option>
              <option value="ar">العربية (Arabic)</option>
            </select>
          </div>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleAccept}
            aria-disabled={pending !== null}
            style={{ width: '100%', marginBottom: '0.6rem' }}
          >
            <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
            {pending ? 'Accepting…' : 'Accept and email client'}
          </button>
          <Link
            href={`/admin/projects/new?requestId=${leadId}`}
            className={`${styles.button} ${styles.buttonSecondary}`}
            style={{ width: '100%' }}
          >
            <SlidersHorizontal size={16} strokeWidth={2} aria-hidden="true" />
            Customize, then convert
          </Link>
        </>
      )}
    </div>
  );
}
