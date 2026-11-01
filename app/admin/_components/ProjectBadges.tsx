import {
  PROJECT_STATUS_LABELS,
  PROPOSAL_STATE_LABELS,
  WORK_STATUS_LABELS,
  isProjectStatus,
  isWorkStatus,
  type InvitationState,
  type ProjectStatus,
  type ProposalState,
  type WorkStatus,
} from '../../lib/portal/constants';
import styles from '../admin.module.css';

/** Portal statuses reuse the lead badge palette from admin.module.css. */
const PROJECT_BADGE: Record<ProjectStatus, string> = {
  planning: styles.badgeNew,
  in_progress: styles.badgeContacted,
  review: styles.badgeProposal,
  on_hold: styles.badgeArchived,
  completed: styles.badgeWon,
};

const WORK_BADGE: Record<WorkStatus, string> = {
  todo: styles.badgeArchived,
  in_progress: styles.badgeContacted,
  done: styles.badgeWon,
};

const INVITATION_BADGE: Record<InvitationState, string> = {
  pending: styles.badgeContacted,
  accepted: styles.badgeWon,
  expired: styles.badgeLost,
  revoked: styles.badgeArchived,
};

const PROPOSAL_BADGE: Record<ProposalState, string> = {
  draft: styles.badgeNew,
  sent: styles.badgeProposal,
  changes_requested: styles.badgeContacted,
  accepted: styles.badgeWon,
  declined: styles.badgeLost,
  superseded: styles.badgeArchived,
  expired: styles.badgeLost,
};

export function ProjectStatusBadge({ status }: { status: string }) {
  const key = isProjectStatus(status) ? status : 'planning';
  return <span className={`${styles.badge} ${PROJECT_BADGE[key]}`}>{PROJECT_STATUS_LABELS[key]}</span>;
}

export function WorkStatusBadge({ status }: { status: string }) {
  const key = isWorkStatus(status) ? status : 'todo';
  return <span className={`${styles.badge} ${WORK_BADGE[key]}`}>{WORK_STATUS_LABELS[key]}</span>;
}

export function InvitationBadge({ state }: { state: InvitationState }) {
  return <span className={`${styles.badge} ${INVITATION_BADGE[state]}`}>{state}</span>;
}

export function ProposalBadge({ state }: { state: ProposalState }) {
  return <span className={`${styles.badge} ${PROPOSAL_BADGE[state]}`}>{PROPOSAL_STATE_LABELS[state]}</span>;
}

export function ArchivedBadge() {
  return <span className={`${styles.badge} ${styles.badgeArchived}`}>Archived</span>;
}
