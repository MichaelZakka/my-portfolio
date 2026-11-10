import styles from './LineChart.module.css';

type Point = { date: string; views: number; visitors: number };

type LineChartProps = {
  data: Point[];
  height?: number;
};

/** Height of the date row under the plot. */
const AXIS_HEIGHT = 22;

/**
 * Dependency-free inline SVG line chart for the traffic-over-time card.
 * The SVG stretches to the card's width (preserveAspectRatio="none"), so the
 * date labels are HTML under it and the strokes don't scale: on a phone,
 * SVG text and lines got squashed to unreadable slivers.
 */
export default function LineChart({ data, height = 200 }: LineChartProps) {
  if (data.length === 0) return null;

  const width = 800;
  const padX = 28;
  const padY = 14;
  const plotHeight = height - AXIS_HEIGHT;
  const maxViews = Math.max(1, ...data.map((d) => d.views));
  const maxVisitors = Math.max(1, ...data.map((d) => d.visitors));
  const maxValue = Math.max(maxViews, maxVisitors);

  const stepX = (width - padX * 2) / Math.max(1, data.length - 1);
  const xAt = (index: number) => padX + index * stepX;

  const toPoint = (value: number, index: number) => {
    const y = plotHeight - padY - (value / maxValue) * (plotHeight - padY * 2);
    return `${xAt(index)},${y}`;
  };

  const viewsPath = data.map((d, i) => toPoint(d.views, i)).join(' ');
  const visitorsPath = data.map((d, i) => toPoint(d.visitors, i)).join(' ');

  const labelEvery = Math.ceil(data.length / 7);

  return (
    <div className={styles.chart}>
      <svg
        viewBox={`0 0 ${width} ${plotHeight}`}
        width="100%"
        height={plotHeight}
        role="img"
        aria-label="Page views and unique visitors over time"
        preserveAspectRatio="none"
      >
        <line
          x1={padX}
          y1={plotHeight - padY}
          x2={width - padX}
          y2={plotHeight - padY}
          stroke="#1b2f52"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={viewsPath}
          fill="none"
          stroke="#3d8bff"
          strokeWidth={2.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={visitorsPath}
          fill="none"
          stroke="#34d399"
          strokeWidth={2}
          strokeDasharray="4 3"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className={styles.axis} style={{ height: AXIS_HEIGHT }} aria-hidden="true">
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <span key={d.date} className={styles.tick} style={{ left: `${(xAt(i) / width) * 100}%` }}>
              {d.date.slice(5)}
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}
