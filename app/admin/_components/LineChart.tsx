type Point = { date: string; views: number; visitors: number };

type LineChartProps = {
  data: Point[];
  height?: number;
};

/** Dependency-free inline SVG line chart for the traffic-over-time card. */
export default function LineChart({ data, height = 200 }: LineChartProps) {
  if (data.length === 0) return null;

  const width = 800;
  const padding = 28;
  const maxViews = Math.max(1, ...data.map((d) => d.views));
  const maxVisitors = Math.max(1, ...data.map((d) => d.visitors));
  const maxValue = Math.max(maxViews, maxVisitors);

  const stepX = (width - padding * 2) / Math.max(1, data.length - 1);

  const toPoint = (value: number, index: number) => {
    const x = padding + index * stepX;
    const y = height - padding - (value / maxValue) * (height - padding * 2);
    return `${x},${y}`;
  };

  const viewsPath = data.map((d, i) => toPoint(d.views, i)).join(' ');
  const visitorsPath = data.map((d, i) => toPoint(d.visitors, i)).join(' ');

  const labelEvery = Math.ceil(data.length / 7);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label="Page views and unique visitors over time"
      preserveAspectRatio="none"
    >
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#1b2f52"
        strokeWidth={1}
      />
      <polyline points={viewsPath} fill="none" stroke="#3d8bff" strokeWidth={2.5} />
      <polyline points={visitorsPath} fill="none" stroke="#34d399" strokeWidth={2} strokeDasharray="4 3" />
      {data.map((d, i) =>
        i % labelEvery === 0 ? (
          <text
            key={d.date}
            x={padding + i * stepX}
            y={height - 6}
            fontSize="10"
            fill="#7d8ba3"
            textAnchor="middle"
          >
            {d.date.slice(5)}
          </text>
        ) : null
      )}
    </svg>
  );
}
