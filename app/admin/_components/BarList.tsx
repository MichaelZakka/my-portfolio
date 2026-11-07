import styles from './BarList.module.css';

type BarListProps = {
  items: { label: string; value: number }[];
};

export default function BarList({ items }: BarListProps) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div>
      {items.map((item) => (
        <div className={styles.row} key={item.label}>
          <div className={styles.trackWrap}>
            <span className={styles.label} title={item.label}>
              {item.label}
            </span>
            <span className={styles.track}>
              <span
                className={styles.fill}
                style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
              />
            </span>
          </div>
          <span className={styles.value}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
