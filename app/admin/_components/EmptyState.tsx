import styles from '../admin.module.css';

type EmptyStateProps = {
  title: string;
  description?: string;
};

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateTitle}>{title}</div>
      {description && <p>{description}</p>}
    </div>
  );
}
