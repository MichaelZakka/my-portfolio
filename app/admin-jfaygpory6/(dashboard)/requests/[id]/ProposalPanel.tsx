'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FilePen, FilePlus2 } from 'lucide-react';
import type { ProposalState } from '../../../../lib/portal/constants';
import { ProposalBadge } from '../../../_components/ProjectBadges';
import { jsonInit, useAdminAction } from '../../projects/useAdminAction';
import styles from '../../../admin.module.css';
import projectStyles from '../../projects/projects.module.css';

export type ProposalRow = {
  id: string;
  version: number;
  state: ProposalState;
  total: string;
  detail: string;
  note: string | null;
};

/**
 * The request's proposals, newest first. A sent version is locked; revising
 * opens the next version as a draft copied from the latest one.
 */
export default function ProposalPanel({
  leadId,
  converted,
  proposals,
}: {
  leadId: string;
  converted: boolean;
  proposals: ProposalRow[];
}) {
  const router = useRouter();
  const { run, pending, error } = useAdminAction();
  const latest = proposals[0];
  const draft = proposals.find((p) => p.state === 'draft');
  const canCreate = !converted && !draft && latest?.state !== 'accepted';

  const handleCreate = async () => {
    const result = await run<{ proposalId: string }>('create', `/api/admin/requests/${leadId}/proposals`, jsonInit('POST'));
    if (result) router.push(`/admin-jfaygpory6/proposals/${result.proposalId}`);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Proposal</span>
      </div>
      {error && (
        <div className={styles.bannerError} role="alert">
          {error}
        </div>
      )}

      {proposals.length === 0 ? (
        <p className={styles.pageSubtitle} style={{ marginBottom: '0.75rem' }}>
          Send a priced scope first. The client answers on a private page; accepting creates the project, a milestone
          per phase and their portal account.
        </p>
      ) : (
        <ul className={projectStyles.list} style={{ marginBottom: '0.75rem' }}>
          {proposals.map((proposal) => (
            <li key={proposal.id} className={projectStyles.item}>
              <div className={projectStyles.itemMain}>
                <div className={projectStyles.titleRow}>
                  <Link href={`/admin-jfaygpory6/proposals/${proposal.id}`} className={styles.link}>
                    Version {proposal.version}
                  </Link>
                  <ProposalBadge state={proposal.state} />
                  <span className={projectStyles.muted}>{proposal.total}</span>
                </div>
                <span className={projectStyles.muted}>{proposal.detail}</span>
                {proposal.note && (
                  <p className={projectStyles.itemDescription} dir="auto">
                    “{proposal.note}”
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {draft && !converted && (
        <Link
          href={`/admin-jfaygpory6/proposals/${draft.id}`}
          className={`${styles.button} ${styles.buttonPrimary}`}
          style={{ width: '100%' }}
        >
          <FilePen size={16} strokeWidth={2} aria-hidden="true" />
          Continue editing version {draft.version}
        </Link>
      )}
      {canCreate && (
        <button
          type="button"
          className={`${styles.button} ${latest ? styles.buttonSecondary : styles.buttonPrimary}`}
          onClick={handleCreate}
          aria-disabled={pending !== null}
          style={{ width: '100%' }}
        >
          <FilePlus2 size={16} strokeWidth={2} aria-hidden="true" />
          {pending ? 'Opening…' : latest ? `Revise as version ${latest.version + 1}` : 'Create proposal from this brief'}
        </button>
      )}
    </div>
  );
}
