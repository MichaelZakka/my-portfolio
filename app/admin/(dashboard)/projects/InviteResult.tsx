'use client';

import LinkShareCard from './LinkShareCard';

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
  return (
    <LinkShareCard
      what="Invitation"
      email={outcome.email}
      url={outcome.inviteUrl}
      delivery={outcome.delivery}
      validity="works once and expires in 7 days"
      onDismiss={onDismiss}
    />
  );
}
