'use client';

import { FormEvent, useState } from 'react';
import type { InvitationState } from '../../../../lib/portal/constants';
import { InvitationBadge } from '../../../_components/ProjectBadges';
import InviteResult, { type InviteOutcome } from '../InviteResult';
import { jsonInit, useAdminAction } from '../useAdminAction';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';

type Member = { id: string; name: string; email: string; activated: boolean; lastLogin: string | null };
type Invitation = {
  id: string;
  email: string;
  state: InvitationState;
  lastSent: string | null;
  expires: string;
  emailSent: boolean;
  emailError: string | null;
};

type InviteResponse = { inviteUrl: string; email: { sent: boolean; error?: string } };

export default function ClientAccessPanel({
  projectId,
  members,
  invitations,
}: {
  projectId: string;
  members: Member[];
  invitations: Invitation[];
}) {
  const { run, pending, error } = useAdminAction();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [locale, setLocale] = useState('en');
  const [outcome, setOutcome] = useState<InviteOutcome | null>(null);

  const base = `/api/admin/projects/${projectId}`;

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    setOutcome(null);
    const result = await run<InviteResponse>('invite', `${base}/invitations`, jsonInit('POST', { email, name, locale }));
    if (result) {
      setOutcome({ email, inviteUrl: result.inviteUrl, delivery: result.email });
      setEmail('');
      setName('');
    }
  };

  const resend = async (invitation: Invitation) => {
    setOutcome(null);
    const result = await run<InviteResponse>(
      `resend-${invitation.id}`,
      `${base}/invitations/${invitation.id}/resend`,
      jsonInit('POST')
    );
    if (result) setOutcome({ email: invitation.email, inviteUrl: result.inviteUrl, delivery: result.email });
  };

  const revoke = async (invitation: Invitation) => {
    if (!window.confirm(`Revoke the invitation for ${invitation.email}? The link stops working.`)) return;
    await run(`revoke-${invitation.id}`, `${base}/invitations/${invitation.id}/revoke`, jsonInit('POST'));
  };

  const removeMember = async (member: Member) => {
    if (!window.confirm(`Remove ${member.email}'s access to this project?`)) return;
    await run(`remove-${member.id}`, `${base}/members/${member.id}`, jsonInit('DELETE'));
  };

  return (
    <section className={styles.card} aria-labelledby="access-title">
      <div className={styles.cardHeader}>
        <h2 id="access-title" className={styles.cardTitle}>
          Client access
        </h2>
        <span className={styles.cardMeta}>Only these people can open this project in /portal.</span>
      </div>

      {error && (
        <div className={styles.bannerError} role="alert">
          {error}
        </div>
      )}
      {outcome && <InviteResult outcome={outcome} onDismiss={() => setOutcome(null)} />}

      {members.length === 0 ? (
        <p className={projectStyles.muted}>No client has accepted an invitation yet.</p>
      ) : (
        <ul className={projectStyles.list} aria-label="Clients with access">
          {members.map((member) => (
            <li key={member.id} className={projectStyles.item}>
              <div className={projectStyles.itemMain}>
                <span className={projectStyles.itemTitle}>{member.name || member.email}</span>
                <span className={projectStyles.muted}>
                  {member.email} · {member.lastLogin ? `last sign-in ${member.lastLogin}` : 'never signed in'}
                </span>
              </div>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => removeMember(member)}
                aria-disabled={pending !== null}
              >
                {pending === `remove-${member.id}` ? 'Removing…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className={projectStyles.addForm} onSubmit={handleInvite}>
        <div className={projectStyles.stackForm}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="invite-email">
              Invite by email
            </label>
            <input
              id="invite-email"
              type="email"
              required
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={projectStyles.formGrid}>
            <div className={styles.filterField}>
              <label className={styles.filterLabel} htmlFor="invite-name">
                Name (optional)
              </label>
              <input
                id="invite-name"
                className={styles.input}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel} htmlFor="invite-locale">
                Email language
              </label>
              <select id="invite-locale" className={styles.select} value={locale} onChange={(e) => setLocale(e.target.value)}>
                <option value="en">English</option>
                <option value="ar">العربية (Arabic)</option>
              </select>
            </div>
          </div>
          <div className={projectStyles.formActions}>
            <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} aria-disabled={pending !== null}>
              {pending === 'invite' ? 'Sending…' : 'Send invitation'}
            </button>
          </div>
        </div>
      </form>

      {invitations.length > 0 && (
        <div className={projectStyles.addForm}>
          <h3 className={projectStyles.groupTitle}>Invitations</h3>
          <ul className={projectStyles.list}>
            {invitations.map((invitation) => {
              const open = invitation.state === 'pending' || invitation.state === 'expired';
              return (
                <li key={invitation.id} className={projectStyles.item}>
                  <div className={projectStyles.itemMain}>
                    <span className={projectStyles.titleRow}>
                      <span className={projectStyles.itemTitle}>{invitation.email}</span>
                      <InvitationBadge state={invitation.state} />
                    </span>
                    <span className={projectStyles.muted}>
                      {invitation.lastSent ? `Sent ${invitation.lastSent}` : 'Not sent'}
                      {invitation.state === 'pending' && ` · expires ${invitation.expires}`}
                    </span>
                    {invitation.emailSent ? (
                      <span className={projectStyles.successText}>Email delivered to Resend</span>
                    ) : (
                      invitation.emailError && (
                        <span className={projectStyles.errorText}>Email not sent: {invitation.emailError}</span>
                      )
                    )}
                  </div>
                  {open && (
                    <div className={projectStyles.itemControls}>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.buttonSecondary}`}
                        onClick={() => resend(invitation)}
                        aria-disabled={pending !== null}
                      >
                        {pending === `resend-${invitation.id}` ? 'Sending…' : 'Resend'}
                      </button>
                      {invitation.state === 'pending' && (
                        <button
                          type="button"
                          className={`${styles.button} ${styles.buttonSecondary}`}
                          onClick={() => revoke(invitation)}
                          aria-disabled={pending !== null}
                        >
                          {pending === `revoke-${invitation.id}` ? 'Revoking…' : 'Revoke'}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
