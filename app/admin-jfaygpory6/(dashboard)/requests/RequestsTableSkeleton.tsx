import { TableSkeleton, type SkeletonColumn } from '../../_components/Skeleton';
import styles from '../../admin.module.css';

const COLUMNS: SkeletonColumn[] = [
  { label: 'Project', width: 13 },
  { label: 'Client', width: 7, sub: 11 },
  { label: 'Type', width: 7 },
  { label: 'Budget', width: 5 },
  { label: 'Status', width: 5, badge: true },
  { label: 'Received', width: 5.5 },
];

/** The requests table while a page of results loads (opening the screen, filtering, paging). */
export default function RequestsTableSkeleton() {
  return (
    <div className={styles.card}>
      <TableSkeleton columns={COLUMNS} rows={8} />
    </div>
  );
}
