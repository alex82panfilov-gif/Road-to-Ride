import { labels } from "@/lib/content";
import { rub } from "@/lib/format";
import type { Risk } from "@/lib/schema";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

const icon = {
  low: Info,
  medium: AlertTriangle,
  high: ShieldAlert,
  critical: ShieldAlert,
};

const tone = {
  low: "text-muted",
  medium: "text-warning",
  high: "text-danger",
  critical: "text-danger",
};

export function RiskItem({ risk }: { risk: Risk }) {
  const Icon = icon[risk.severity];
  return (
    <article className="card p-4">
      <div className={`flex items-center gap-2 font-medium ${tone[risk.severity]}`}>
        <Icon aria-hidden="true" size={18} strokeWidth={1.5} />
        <span>
          {risk.title}. Серьёзность: {labels.severity[risk.severity]}
        </span>
      </div>
      <p className="mt-3 text-sm">Как проверить: {risk.howToCheck}</p>
      {risk.repairCostRub ? (
        <p className="mt-1 text-sm text-muted">
          Ремонт в Москве, ориентир: {rub(risk.repairCostRub[0])}–{rub(risk.repairCostRub[1])}
        </p>
      ) : null}
      <ul className="mt-2 text-xs text-muted">
        {[...new Set(risk.sources)].map((source) => (
          <li key={source}>
            <a href={source} target="_blank" rel="noreferrer">
              Источник
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}
