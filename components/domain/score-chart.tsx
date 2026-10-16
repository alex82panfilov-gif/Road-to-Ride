import { rub } from "@/lib/format";
import type { TierStep } from "@/lib/market";

export function ScoreChart({ steps, marks }: { steps: TierStep[]; marks: number[] }) {
  const width = 640;
  const height = 180;
  const pad = 16;
  const maxScore = 10;
  const x = (amount: number) => pad + ((amount - steps[0].amount) / (steps[steps.length - 1].amount - steps[0].amount)) * (width - pad * 2);
  const y = (score: number) => height - pad - (score / maxScore) * (height - pad * 2);
  const line = steps.map((step) => `${x(step.amount)},${y(step.score)}`).join(" ");

  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Оценка лучшей машины в каждом бюджете" className="w-full">
        {marks.map((amount) => (
          <line key={amount} x1={x(amount)} x2={x(amount)} y1={pad} y2={height - pad} stroke="var(--warning)" strokeDasharray="4 4" />
        ))}
        <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="2" />
        {steps.map((step) => (
          <circle key={step.amount} cx={x(step.amount)} cy={y(step.score)} r="3.5" fill="var(--accent)">
            <title>{`${rub(step.amount)}: ${step.score || "нет машины"}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="mt-2 text-sm text-muted">
        Точки на пунктире — суммы, где оценка заметно растёт. Имеет смысл дотерпеть до них, если до копить недолго.
      </figcaption>
    </figure>
  );
}
