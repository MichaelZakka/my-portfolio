import type { CSSProperties, ReactNode } from 'react';
import admin from '../admin.module.css';
import bars from './BarList.module.css';
import styles from './Skeleton.module.css';

/**
 * Shimmering placeholders for dashboard screens that are still loading.
 *
 * Bones sit inside the same elements (and classes) the real content uses, so
 * they inherit its font size and line height and the screen keeps its shape
 * when the data arrives. No hooks or browser APIs, so they render on the
 * server (in-page Suspense fallbacks) and in the client (ScreenSkeleton).
 */

type Length = number | string;

/** Widths vary row to row so a placeholder list doesn't read as a grid of identical bars. */
const VARIATION = [1, 0.72, 0.88, 0.6, 0.95, 0.78];

export function vary(em: number, index: number): string {
  return `${Math.round(em * VARIATION[index % VARIATION.length] * 100) / 100}em`;
}

/** Height of a status badge (StatusBadge, ProjectStatusBadge). */
export const BADGE_HEIGHT = '1.55rem';

function range(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i);
}

type BoneProps = {
  /** Text-like bones read best in em, so they scale with the text they stand in for. */
  width?: Length;
  /** Defaults to a line of the surrounding text. */
  height?: Length;
  /** A block shape (chart, bar, icon) instead of a line of text. */
  block?: boolean;
  /** Pill ends, for badges and chips. */
  round?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** One shimmering placeholder shape. Decorative: the region around it announces the loading. */
export function Bone({ width = '100%', height, block, round, className, style }: BoneProps) {
  const classes = [styles.bone, block && styles.block, round && styles.round, className]
    .filter(Boolean)
    .join(' ');
  return <span aria-hidden="true" className={classes} style={{ width, height, ...style }} />;
}

/**
 * Wraps a loading placeholder: marks it busy and tells screen readers what is loading.
 * Whole-screen skeletons fade in; the in-page fallbacks that replace a list
 * (filters, pagination) show at once.
 */
export function LoadingRegion({
  label,
  fade = true,
  children,
}: {
  label: string;
  fade?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={fade ? styles.region : undefined} aria-busy="true">
      <p className="visually-hidden" role="status">
        {label}
      </p>
      {children}
    </div>
  );
}

/** An input or button: pass the width the real control usually has. */
export function ControlSkeleton({ width, filter }: { width?: Length; filter?: boolean }) {
  return (
    <Bone
      block
      className={`${styles.control} ${filter ? styles.filterInput : ''}`}
      style={width === undefined ? undefined : ({ '--control-width': typeof width === 'number' ? `${width}px` : width } as CSSProperties)}
    />
  );
}

export function ButtonSkeleton({ width = '7rem' }: { width?: Length }) {
  return <ControlSkeleton width={width} />;
}

export function BackLinkSkeleton() {
  return (
    <div className={styles.backLink}>
      <Bone width="9em" />
    </div>
  );
}

/** Title and subtitle. A known title renders as text, so the screen is recognisable at once. */
export function PageHeaderSkeleton({ title, back }: { title?: string; back?: boolean }) {
  return (
    <>
      {back && <BackLinkSkeleton />}
      <div className={admin.pageHeader}>
        {title ? (
          <h1 className={admin.pageTitle}>{title}</h1>
        ) : (
          <div className={admin.pageTitle}>
            <Bone width="11em" />
          </div>
        )}
        <p className={admin.pageSubtitle}>
          <Bone width="19em" />
        </p>
      </div>
    </>
  );
}

export function CardSkeleton({
  title = '9em',
  meta,
  children,
}: {
  /** Width of the card title */
  title?: Length;
  /** Width of the grey note beside the title, if the real card has one */
  meta?: Length;
  children?: ReactNode;
}) {
  return (
    <div className={admin.card}>
      <div className={admin.cardHeader}>
        <span className={admin.cardTitle}>
          <Bone width={title} />
        </span>
        {meta && (
          <span className={admin.cardMeta}>
            <Bone width={meta} />
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function KpiGridSkeleton({ count, hint = true }: { count: number; hint?: boolean }) {
  return (
    <div className={admin.kpiGrid}>
      {range(count).map((i) => (
        <div key={i} className={admin.kpiCard}>
          <div className={admin.kpiLabel}>
            <Bone width={vary(9, i)} />
          </div>
          <div className={admin.kpiValue}>
            <Bone width={vary(2.4, i + 3)} />
          </div>
          {hint && (
            <div className={admin.kpiHint}>
              <Bone width={vary(8, i + 1)} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Matches BarList: label, a bar that shrinks row by row, and the count. */
const BAR_FILL = [90, 66, 50, 38, 26, 16];

export function BarListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {range(rows).map((i) => (
        <div key={i} className={bars.row}>
          <div className={bars.trackWrap}>
            <span className={bars.label}>
              <Bone width={vary(7, i + 2)} />
            </span>
            <span className={bars.track}>
              <Bone block width={`${BAR_FILL[i % BAR_FILL.length]}%`} height="100%" />
            </span>
          </div>
          <span className={bars.value}>
            <Bone width="1.6em" />
          </span>
        </div>
      ))}
    </div>
  );
}

/** A traffic chart (LineChart is 200px tall). */
export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return <Bone block height={height} style={{ borderRadius: 8 }} />;
}

/** Paragraph text: full lines and a shorter last one. */
export function LinesSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div>
      {range(lines).map((i) => (
        <div key={i}>
          <Bone width={i === lines - 1 ? '62%' : i % 2 ? '93%' : '100%'} />
        </div>
      ))}
    </div>
  );
}

/** Label/value pairs in the shared detail grid. */
export function DetailGridSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className={admin.detailGrid}>
      {range(fields).map((i) => (
        <div key={i} className={admin.detailField}>
          <span className={admin.detailLabel}>
            <Bone width={vary(6, i)} />
          </span>
          <span className={admin.detailValue}>
            <Bone width={vary(10, i + 2)} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** Labelled form fields; `multiline` marks a textarea (by index). */
export function FormSkeleton({ fields, multiline }: { fields: number; multiline?: number }) {
  return (
    <div className={styles.form}>
      {range(fields).map((i) => (
        <div key={i} className={admin.filterField}>
          <span className={admin.filterLabel}>
            <Bone width={vary(7, i)} />
          </span>
          {i === multiline ? <Bone block height={90} style={{ borderRadius: 8 }} /> : <ControlSkeleton />}
        </div>
      ))}
    </div>
  );
}

/** The filters bar above a list: one width per field, then the buttons. */
export function FiltersSkeleton({ fields, buttons = 1 }: { fields: Length[]; buttons?: number }) {
  return (
    <div className={admin.filtersBar}>
      {fields.map((width, i) => (
        <div key={i} className={admin.filterField}>
          <span className={admin.filterLabel}>
            <Bone width={vary(5, i)} />
          </span>
          <ControlSkeleton width={width} filter />
        </div>
      ))}
      {range(buttons).map((i) => (
        <ButtonSkeleton key={i} width="5rem" />
      ))}
    </div>
  );
}

export type SkeletonColumn = {
  /** The real column heading; also labels the cell in the phone layout. */
  label: string;
  /** Typical width of the value, in em */
  width: number;
  /** Width of a smaller second line (an email under a name), in em */
  sub?: number;
  /** The cell holds a status badge */
  badge?: boolean;
};

/** A table in the shared admin style; it turns into cards on phones like the real one. */
export function TableSkeleton({ columns, rows = 6 }: { columns: SkeletonColumn[]; rows?: number }) {
  return (
    <div className={admin.tableScroll}>
      <table className={admin.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.label}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {range(rows).map((row) => (
            <tr key={row}>
              {columns.map((column, col) => (
                <td key={column.label} data-label={column.label}>
                  {column.badge ? (
                    <Bone round width="5.5em" height={BADGE_HEIGHT} />
                  ) : (
                    <Bone width={vary(column.width, row + col)} />
                  )}
                  {column.sub && (
                    <span className={styles.subLine}>
                      <Bone width={vary(column.sub, row + col + 1)} />
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The row of tabs on a project screen. */
export function TabsSkeleton({ widths, className }: { widths: Length[]; className: string }) {
  return (
    <div className={className} aria-hidden="true">
      {widths.map((width, i) => (
        <span key={i} className={styles.tab}>
          <Bone width={width} />
        </span>
      ))}
    </div>
  );
}
