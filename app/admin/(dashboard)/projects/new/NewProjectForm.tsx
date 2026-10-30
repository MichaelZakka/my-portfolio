'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from '../../../../lib/portal/constants';
import InviteResult, { type InviteOutcome } from '../InviteResult';
import { jsonInit, useAdminAction } from '../useAdminAction';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';

type Lead = {
  id: string;
  title: string;
  description: string;
  clientName: string;
  clientEmail: string;
  status: string;
};

type CreateResponse = {
  project: { id: string; name: string };
  invite:
    | { ok: true; inviteUrl: string; email: { sent: boolean; error?: string } }
    | { ok: false; error: string }
    | null;
};

export default function NewProjectForm({ lead }: { lead: Lead | null }) {
  const { run, pending, error } = useAdminAction();
  const [name, setName] = useState(lead?.title ?? '');
  const [summary, setSummary] = useState(lead?.description ?? '');
  const [status, setStatus] = useState<string>('planning');
  const [currentPhase, setCurrentPhase] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [markRequestWon, setMarkRequestWon] = useState(lead ? lead.status !== 'won' : false);
  const [invite, setInvite] = useState(Boolean(lead?.clientEmail));
  const [inviteEmail, setInviteEmail] = useState(lead?.clientEmail ?? '');
  const [inviteName, setInviteName] = useState(lead?.clientName ?? '');
  const [inviteLocale, setInviteLocale] = useState('en');
  const [created, setCreated] = useState<CreateResponse | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await run<CreateResponse>(
      'create',
      '/api/admin/projects',
      jsonInit('POST', {
        name,
        summary,
        status,
        currentPhase,
        estimatedCompletion: estimatedCompletion || null,
        ...(lead ? { requestId: lead.id, markRequestWon } : {}),
        ...(invite ? { invite: { email: inviteEmail, name: inviteName, locale: inviteLocale } } : {}),
      })
    );
    if (result) setCreated(result);
  };

  if (created) {
    const outcome: InviteOutcome | null =
      created.invite?.ok
        ? { email: inviteEmail, inviteUrl: created.invite.inviteUrl, delivery: created.invite.email }
        : null;
    return (
      <div className={styles.card}>
        <div className={styles.bannerSuccess} role="status">
          Project “{created.project.name}” created.
        </div>
        {outcome && <InviteResult outcome={outcome} />}
        {created.invite && !created.invite.ok && (
          <div className={styles.bannerError}>The project was created, but the invitation failed: {created.invite.error}</div>
        )}
        <Link href={`/admin/projects/${created.project.id}`} className={`${styles.button} ${styles.buttonPrimary}`}>
          Open project
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      {error && (
        <div className={styles.bannerError} role="alert">
          {error}
        </div>
      )}
      <div className={projectStyles.formGrid}>
        <div className={`${styles.filterField} ${projectStyles.fieldWide}`}>
          <label className={styles.filterLabel} htmlFor="project-name">
            Project name
          </label>
          <input
            id="project-name"
            className={styles.input}
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className={`${styles.filterField} ${projectStyles.fieldWide}`}>
          <label className={styles.filterLabel} htmlFor="project-summary">
            Summary (visible to the client)
          </label>
          <textarea
            id="project-summary"
            className={styles.textarea}
            maxLength={5000}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="project-status">
            Status
          </label>
          <select id="project-status" className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
            {PROJECT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {PROJECT_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="project-phase">
            Current phase
          </label>
          <input
            id="project-phase"
            className={styles.input}
            maxLength={200}
            placeholder="e.g. Discovery"
            value={currentPhase}
            onChange={(e) => setCurrentPhase(e.target.value)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="project-eta">
            Estimated completion
          </label>
          <input
            id="project-eta"
            type="date"
            className={styles.input}
            value={estimatedCompletion}
            onChange={(e) => setEstimatedCompletion(e.target.value)}
          />
        </div>
      </div>

      {lead && (
        <div className={projectStyles.addForm}>
          <label className={projectStyles.checkboxLabel}>
            <input type="checkbox" checked={markRequestWon} onChange={(e) => setMarkRequestWon(e.target.checked)} />
            Mark the request as Won
          </label>
        </div>
      )}

      <fieldset className={projectStyles.addForm} style={{ border: 0, padding: 0, paddingTop: '1rem' }}>
        <legend className={styles.cardTitle} style={{ marginBottom: '0.75rem' }}>
          Client access
        </legend>
        <label className={projectStyles.checkboxLabel} style={{ marginBottom: '0.75rem' }}>
          <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} />
          Invite the client to the portal now
        </label>
        {invite && (
          <div className={projectStyles.formGrid}>
            <div className={styles.filterField}>
              <label className={styles.filterLabel} htmlFor="invite-email">
                Client email
              </label>
              <input
                id="invite-email"
                type="email"
                className={styles.input}
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel} htmlFor="invite-name">
                Client name
              </label>
              <input
                id="invite-name"
                className={styles.input}
                maxLength={100}
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel} htmlFor="invite-locale">
                Email language
              </label>
              <select
                id="invite-locale"
                className={styles.select}
                value={inviteLocale}
                onChange={(e) => setInviteLocale(e.target.value)}
              >
                <option value="en">English</option>
                <option value="ar">العربية (Arabic)</option>
              </select>
            </div>
          </div>
        )}
      </fieldset>

      <div className={projectStyles.formActions} style={{ marginTop: '1.25rem' }}>
        <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} disabled={pending !== null}>
          {pending ? 'Creating…' : 'Create project'}
        </button>
      </div>
    </form>
  );
}
