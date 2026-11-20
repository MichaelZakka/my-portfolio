import { ACCOUNT_STATUS_LABELS, type AccountStatus } from '../../../lib/portal/users';
import styles from '../../admin.module.css';

const BADGE: Record<AccountStatus, string> = {
  active: styles.badgeWon,
  invited: styles.badgeContacted,
  expired: styles.badgeLost,
  no_invite: styles.badgeArchived,
  admin: styles.badgeProposal,
};

export default function AccountBadge({ status }: { status: AccountStatus }) {
  return <span className={`${styles.badge} ${BADGE[status]}`}>{ACCOUNT_STATUS_LABELS[status]}</span>;
}
