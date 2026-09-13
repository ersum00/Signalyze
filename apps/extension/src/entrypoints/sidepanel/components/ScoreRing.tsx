import { useEffect, useState } from 'react';

const SIZE = 104;
const RADIUS = 42;
const STROKE = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TICKS = 10;

/**
 * A gauge-like ring: a light track, a brand-blue arc for the score and ten
 * small ticks marking the 0-100 scale. One hue only, on purpose: the score
 * is a measurement, not a verdict, so no colour band implies one.
 */
export function ScoreRing({ score, label }: { score: number; label: string }) {
  const target = Math.max(0, Math.min(100, score));
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setShown(target);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [target]);

  const center = SIZE / 2;
  const arc = (CIRCUMFERENCE * shown) / 100;
  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const angle = (-90 + (360 / TICKS) * i) * (Math.PI / 180);
    const inner = RADIUS + STROKE / 2 + 3;
    const outer = inner + 4;
    return {
      x1: center + inner * Math.cos(angle),
      y1: center + inner * Math.sin(angle),
      x2: center + outer * Math.cos(angle),
      y2: center + outer * Math.sin(angle),
    };
  });

  return (
    <div
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
      role="img"
      aria-label={`${label}: ${Math.round(target)}`}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        {ticks.map((tick, i) => (
          <line
            key={i}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke="#cbd5e1"
            strokeWidth={i === 0 ? 2 : 1}
            strokeLinecap="round"
          />
        ))}
        <circle
          cx={center}
          cy={center}
          r={RADIUS}
          fill="none"
          stroke="#d9eaff"
          strokeWidth={STROKE}
        />
        <circle
          cx={center}
          cy={center}
          r={RADIUS}
          fill="none"
          stroke="#2563eb"
          strokeWidth={STROKE}
          strokeLinecap={shown > 0 ? 'round' : 'butt'}
          strokeDasharray={`${arc} ${CIRCUMFERENCE}`}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: 'stroke-dasharray 700ms cubic-bezier(0.2, 0.7, 0.2, 1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[30px] leading-none font-semibold tracking-tight text-ink-900">
        {Math.round(target)}
      </span>
    </div>
  );
}
