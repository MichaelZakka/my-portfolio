import styles from '../portal.module.css';

export default function ProgressBar({
  percent,
  label,
  caption,
}: {
  percent: number;
  /** Accessible name of the progressbar. */
  label: string;
  /** Visible text under the bar, also used as aria-valuetext. */
  caption: string;
}) {
  return (
    <div className={styles.progress}>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={caption}
      >
        <div className={styles.progressFill} style={{ inlineSize: `${percent}%` }} />
      </div>
      <span className={styles.progressLabel}>{caption}</span>
    </div>
  );
}
