import { TableSkeleton, type SkeletonColumn } from '../../_components/Skeleton';
import styles from '../../admin.module.css';

const COLUMNS: SkeletonColumn[] = [
  { label: 'Project', width: 11 },
  { label: 'Clients', width: 8 },
  { label: 'Status', width: 5, badge: true },
  { label: 'Phase', width: 6 },
  { label: 'Progress', width: 7 },
  { label: 'Est. completion', width: 6 },
  { label: 'Updated', width: 5.5 },
];

/** The projects table while a view loads (opening the screen, Active / Archived / All). */
export default function ProjectsTableSkeleton() {
  return (
    <div className={styles.card}>
      <TableSkeleton columns={COLUMNS} rows={5} />
    </div>
  );
}
