import type { CSSProperties } from 'react';
import styles from './CircuitBackground.module.css';

/** Deterministic PRNG so server output is stable between builds. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


const CENTER_Y = 450;
const HALF = 15; // lines on each side of the center line
const GAP = 14; // spacing in the bundle; doubles evenly after the 45° bend
const BEND_X = 320;

type Trace = { d: string; end: [number, number]; k: number; side: -1 | 0 | 1 };

function buildTraces(): Trace[] {
  const traces: Trace[] = [];

  // Main bundle, mirrored around the horizontal center line.
  // Line k sits k*GAP from center, bends outward at 45° to 2k*GAP, so spacing stays equal.
  for (let k = -HALF; k <= HALF; k++) {
    const dist = Math.abs(k);
    const y0 = CENTER_Y + k * GAP;
    const y1 = CENTER_Y + k * GAP * 2;
    const x2 = BEND_X + dist * GAP;
    const x3 = x2 + 200 + (HALF - dist) * 40; // inner lines run longest → arrow shape
    traces.push({
      d: `M0 ${y0} H${BEND_X} L${x2} ${y1} H${x3}`,
      end: [x3, y1],
      k: dist,
      side: k === 0 ? 0 : k < 0 ? -1 : 1,
    });
  }

  // Branches from the top edge, mirrored on the bottom edge, evenly spaced in x
  for (let j = 0; j < 8; j++) {
    const x0 = 900 + j * 64;
    const x2 = x0 + 60;
    for (const side of [-1, 1] as const) {
      const edge = side === -1 ? 0 : 900;
      const y1 = edge - side * 40;
      const y2 = edge - side * 100;
      const y3 = edge - side * (140 + j * 16);
      traces.push({
        d: `M${x0} ${edge} V${y1} L${x2} ${y2} V${y3}`,
        end: [x2, y3],
        k: 100 + j,
        side,
      });
    }
  }

  return traces;
}

const TRACES = buildTraces();

// Mirrored pairs share timing so pulses fire symmetrically
const PULSE_KEYS = [0, 3, 6, 9, 12, 15, 101, 104, 107];
const pulseRand = mulberry32(42);
const TIMING = new Map(PULSE_KEYS.map((k) => [k, { dur: 4 + pulseRand() * 3, delay: pulseRand() * 6 }]));
const PULSES = TRACES.filter((t) => TIMING.has(t.k)).map((t) => ({ d: t.d, ...TIMING.get(t.k)! }));

/** Fixed, decorative circuit-board backdrop with travelling light pulses. */
export default function CircuitBackground() {
  return (
    <div className={styles.root} aria-hidden="true">
      <svg
        className={styles.svg}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMinYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="cb-glow" cx="0" cy="0.5" r="0.6">
            <stop offset="0" stopColor="#1a73ff" stopOpacity="0.32" />
            <stop offset="1" stopColor="#1a73ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1440" height="900" fill="url(#cb-glow)" />

        <g className={styles.traces}>
          {TRACES.map((t, i) => (
            <path key={i} d={t.d} />
          ))}
        </g>

        <g className={styles.nodes}>
          {TRACES.map((t, i) => (
            <circle key={i} cx={t.end[0]} cy={t.end[1]} r={2.5} />
          ))}
        </g>

        <g className={styles.pulses}>
          {PULSES.map((p, i) => (
            <g key={i} style={{ '--dur': `${p.dur}s`, '--delay': `${p.delay}s` } as CSSProperties}>
              <path d={p.d} pathLength={1000} className={styles.halo} />
              <path d={p.d} pathLength={1000} className={styles.core} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
