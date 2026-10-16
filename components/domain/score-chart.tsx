import { rub } from "@/lib/format";
import type { TierStep } from "@/lib/market";

function shortAmount(amount: number) {
  if (amount >= 1_000_000) return "1 млн";
  return `${Math.round(amount / 1000)} тыс`;
}

export function ScoreChart({ steps, marks }: { steps: TierStep[]; marks: number[] }) {
  const width = 640;
  const height = 230;
  const padL = 40;
  const padR = 16;
  const padT = 28;
  const padB = 36;
  const maxScore = 10;
  const x = (amount: number) => padL + ((amount - steps[0].amount) / (steps[steps.length - 1].amount - steps[0].amount)) * (width - padL - padR);
  const y = (score: number) => height - padB - (score / maxScore) * (height - padT - padB);
  const priced = steps.filter((step) => step.score > 0);
  const line = priced.map((step) => `${x(step.amount)},${y(step.score)}`).join(" ");
  const firstCar = priced[0];
  const zoneEnd = firstCar ? x(firstCar.amount) : width - padR;

  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Оценка лучшей машины в каждом бюджете" className="w-full">
        {firstCar && firstCar.amount > steps[0].amount ? (
          <>
            <rect x={x(steps[0].amount)} y={padT} width={Math.max(0, zoneEnd - x(steps[0].amount))} height={height - padT - padB} fill="var(--bg-secondary)" />
            {zoneEnd - x(steps[0].amount) > 150 ? (
              <text x={(x(steps[0].amount) + zoneEnd) / 2} y={(padT + height - padB) / 2} textAnchor="middle" fill="var(--text-secondary)" fontSize="12">
                Машин с автоматом нет
              </text>
            ) : null}
          </>
        ) : null}
        <text x={padL - 8} y={y(10)} textAnchor="end" fill="var(--text-secondary)" fontSize="12">
          10
        </text>
        <text x={padL - 8} y={y(0)} textAnchor="end" fill="var(--text-secondary)" fontSize="12">
          0
        </text>
        {[steps[0], steps[Math.floor(steps.length / 2)], steps[steps.length - 1]].filter(Boolean).map((step) => (
          <text key={step.amount} x={x(step.amount)} y={height - 8} textAnchor="middle" fill="var(--text-secondary)" fontSize="12">
            {shortAmount(step.amount)}
          </text>
        ))}
        {marks.map((amount) => {
          const index = steps.findIndex((step) => step.amount === amount);
          const step = steps[index];
          const previous = index > 0 ? steps[index - 1] : null;
          if (!step) return null;
          const delta = previous ? step.score - previous.score : step.score;
          const sign = delta > 0 ? "+" : "";
          return (
            <g key={amount}>
              <line x1={x(amount)} x2={x(amount)} y1={padT} y2={height - padB} stroke="var(--warning)" strokeDasharray="4 4" />
              <text x={x(amount)} y={16} textAnchor="middle" fill="var(--text-secondary)" fontSize="11">
                {shortAmount(amount)}: {sign}
                {delta.toFixed(1).replace(".", ",")} балла
              </text>
            </g>
          );
        })}
        {line ? <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="2" /> : null}
        {priced.map((step) => (
          <circle key={step.amount} cx={x(step.amount)} cy={y(step.score)} r="3.5" fill="var(--accent)">
            <title>{`${rub(step.amount)}: ${step.score}`}</title>
          </circle>
        ))}
      </svg>
      <table className="sr-only">
        <caption>Оценка лучшей машины по бюджету</caption>
        <thead>
          <tr>
            <th scope="col">Бюджет</th>
            <th scope="col">Оценка</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step) => (
            <tr key={step.amount}>
              <td>{rub(step.amount)}</td>
              <td>{step.score ? step.score.toFixed(1).replace(".", ",") : "машин с автоматом нет"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="mt-2 text-sm text-muted">
        Серая зона — бюджеты, где машины с автоматом в каталоге ещё нет. Пунктир — суммы, где оценка заметно растёт.
      </figcaption>
    </figure>
  );
}
