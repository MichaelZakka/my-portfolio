import { LEAD_STATUS_LABELS, type LeadStatus } from '../../lib/leads';
import styles from '../admin.module.css';

const BADGE_CLASS: Record<LeadStatus, string> = {
  new: styles.badgeNew,
  contacted: styles.badgeContacted,
  qualified: styles.badgeQualified,
  proposal: styles.badgeProposal,
  won: styles.badgeWon,
  lost: styles.badgeLost,
  archived: styles.badgeArchived,
};

export default function StatusBadge({ status }: { status: string }) {
  const key = (status in LEAD_STATUS_LABELS ? status : 'new') as LeadStatus;
  return <span className={`${styles.badge} ${BADGE_CLASS[key]}`}>{LEAD_STATUS_LABELS[key]}</span>;
}
