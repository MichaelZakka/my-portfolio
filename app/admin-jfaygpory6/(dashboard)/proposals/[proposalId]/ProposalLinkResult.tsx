'use client';

import LinkShareCard from '../../projects/LinkShareCard';

export type SendResult = { proposalUrl: string; email: { sent: boolean; error?: string }; resent: boolean };

/**
 * Shown right after sending. Like invitations, only the link's hash is stored,
 * so this is the one chance to copy it when the email did not go out.
 */
export default function ProposalLinkResult({ result, recipient }: { result: SendResult; recipient: string }) {
  return (
    <LinkShareCard
      what={result.resent ? 'New proposal link' : 'Proposal'}
      email={recipient}
      url={result.proposalUrl}
      delivery={result.email}
      validity="stays valid until the proposal expires; older links to this version no longer work"
    />
  );
}
