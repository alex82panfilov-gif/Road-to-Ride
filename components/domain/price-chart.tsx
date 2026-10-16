import { formatMonth } from "@/lib/format";
import type { PricePoint } from "@/lib/market";

export function PriceChart({ points }: { points: PricePoint[] }) {
  if (points.length < 2) return null;
  const width = 360;
  const height = 140;
  const pad = 12;
  const values = points.flatMap((point) => [point.p25, point.p75]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const x = (index: number) => pad + (index * (width - pad * 2)) / (points.length - 1);
  const y = (value: number) => height - pad - ((value - min) / span) * (height - pad * 2);
  const line = points.map((point, index) => `${x(index)},${y(point.median)}`).join(" ");
  const band = [
    ...points.map((point, index) => `${x(index)},${y(point.p75)}`),
    ...points
      .slice()
      .reverse()
      .map((point, index) => `${x(points.length - 1 - index)},${y(point.p25)}`),
  ].join(" ");

  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="История ориентира цены" className="w-full">
        <polygon points={band} fill="color-mix(in srgb, var(--accent) 18%, transparent)" />
        <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="2" />
      </svg>
      <figcaption className="mt-2 flex justify-between text-xs text-muted">
        <span>{formatMonth(points[0].month)}</span>
        <span>{formatMonth(points[points.length - 1].month)}</span>
      </figcaption>
    </figure>
  );
}
