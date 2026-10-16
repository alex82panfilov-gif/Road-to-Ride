type RingProps = {
  outer: number;
  inner: number;
  outerLabel: string;
  innerLabel: string;
};

function Arc({ radius, value, color }: { radius: number; value: number; color: string }) {
  const size = 220;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <g>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--separator)" strokeWidth="12" />
      <circle
        className="ring-stroke"
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </g>
  );
}

export function Ring({ outer, inner, outerLabel, innerLabel }: RingProps) {
  return (
    <figure className="flex flex-col items-center gap-4">
      <div className="sr-only" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(outer * 100)}>
        {outerLabel}
      </div>
      <div className="sr-only" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(inner * 100)}>
        {innerLabel}
      </div>
      <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true">
        <Arc radius={96} value={outer} color="var(--accent)" />
        <Arc radius={72} value={inner} color="var(--success)" />
      </svg>
      <figcaption className="max-w-sm space-y-1 text-center text-sm text-muted">
        <p>{outerLabel}</p>
        <p>{innerLabel}</p>
      </figcaption>
    </figure>
  );
}
