'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogOut, Send } from 'lucide-react';
import { confirmDialog } from '../../../../components/confirmDialog';
import { InvitationBadge } from '../../../_components/ProjectBadges';
import InviteResult, { type InviteOutcome } from '../../projects/InviteResult';
import { jsonInit, useAdminAction } from '../../projects/useAdminAction';
import type { InvitationState } from '../../../../lib/portal/constants';
import styles from '../../../admin.module.css';
import pageStyles from '../users.module.css';

type InviteResponse = { inviteUrl: string; email: { sent: boolean; error?: string } };

/** Signs a client out of every device. Admin accounts have no portal session to end. */
export function SignOutButton({ userId, label }: { userId: string; label: string }) {
  const { run, pending, error } = useAdminAction();
  const [done, setDone] = useState(false);

  const signOut = async () => {
    const confirmed = await confirmDialog({
      title: 'Sign out of every device?',
      message: `${label} is signed out of the portal everywhere. Their password stays the same, so they can sign straight back in. Use this if a device was lost or someone else may have access.`,
      confirmLabel: 'Sign out everywhere',
      danger: true,
    });
    if (!confirmed) return;
    setDone(false);
    if (await run('sign-out', `/api/admin/users/${userId}/sign-out`, jsonInit('POST'))) setDone(true);
  };

  return (
    <div>
      <button
        type="button"
        className={`${styles.button} ${styles.buttonSecondary}`}
        onClick={signOut}
        aria-disabled={pending === 'sign-out'}
      >
        <LogOut size={15} strokeWidth={2} aria-hidden="true" />
        {pending === 'sign-out' ? 'Signing out…' : 'Sign out everywhere'}
      </button>
      <div aria-live="polite">
        {done && <p className={pageStyles.note}>Signed out. Logged in each of their projects’ activity.</p>}
        {error && <p className={styles.bannerError}>{error}</p>}
      </div>
    </div>
  );
}

export type InvitationItem = {
  id: string;
  projectId: string;
  projectName: string;
  state: InvitationState;
  lastSent: string;
  expires: string;
  emailProblem: boolean;
};

/** Invitations for this person, with a resend for any still open (pending or expired). */
export function InvitationList({ email, invitations }: { email: string; invitations: InvitationItem[] }) {
  const { run, pending, error } = useAdminAction();
  const [outcome, setOutcome] = useState<InviteOutcome | null>(null);

  const resend = async (invitation: InvitationItem) => {
    setOutcome(null);
    const result = await run<InviteResponse>(
      `resend-${invitation.id}`,
      `/api/admin/projects/${invitation.projectId}/invitations/${invitation.id}/resend`,
      jsonInit('POST')
    );
    if (result) setOutcome({ email, inviteUrl: result.inviteUrl, delivery: result.email });
  };

  return (
    <>
      {outcome && <InviteResult outcome={outcome} onDismiss={() => setOutcome(null)} />}
      {error && <p className={styles.bannerError}>{error}</p>}
      <ul className={pageStyles.list}>
        {invitations.map((invitation) => {
          const open = invitation.state === 'pending' || invitation.state === 'expired';
          const busy = pending === `resend-${invitation.id}`;
          return (
            <li key={invitation.id} className={pageStyles.listItem}>
              <div className={pageStyles.listMain}>
                <Link href={`/admin-jfaygpory6/projects/${invitation.projectId}?tab=clients`} className={styles.link}>
                  {invitation.projectName}
                </Link>
                <InvitationBadge state={invitation.state} />
                {invitation.emailProblem && open && <span className={pageStyles.muted}>Email not delivered</span>}
              </div>
              <div className={pageStyles.listMain}>
                <span className={pageStyles.time}>
                  {invitation.lastSent}
                  {open ? ` · ${invitation.state === 'expired' ? 'expired' : 'expires'} ${invitation.expires}` : ''}
                </span>
                {open && (
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    onClick={() => resend(invitation)}
                    aria-disabled={busy}
                  >
                    <Send size={14} strokeWidth={2} aria-hidden="true" />
                    {busy ? 'Sending…' : invitation.state === 'expired' ? 'Send a new link' : 'Resend'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
