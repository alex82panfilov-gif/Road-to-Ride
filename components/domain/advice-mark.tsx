import type { Advice, Verdict } from "@/lib/advice";
import { labels } from "@/lib/content";
import { displayName } from "@/lib/market";
import Link from "next/link";

const caption: Record<Verdict, string> = {
  best: "Лучший выбор за эти деньги",
  ok: "Можно рассматривать",
  caution: "Осторожно",
  avoid: "Не рекомендуем",
};

export type ModelLink = { slug: string; brand: string; model: string };

export function AdviceMark({
  advice,
  open,
  onToggle,
  items,
}: {
  advice: Advice;
  open: boolean;
  onToggle: () => void;
  items: ModelLink[];
}) {
  const instead = advice.insteadSlugs
    .map((slug) => items.find((item) => item.slug === slug))
    .filter((item): item is ModelLink => Boolean(item));

  return (
    <div>
      <button type="button" className="inline-flex items-center gap-2 text-left" aria-expanded={open} onClick={onToggle}>
        <Sign verdict={advice.verdict} />
        <span className="text-xs">{caption[advice.verdict]}</span>
      </button>
      {open ? (
        <div className="mt-2 space-y-1 text-sm">
          <ul className="list-disc pl-4">
            {advice.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {instead.length ? (
            <p>
              Вместо неё:{" "}
              {instead.map((item, index) => (
                <span key={item.slug}>
                  {index ? ", " : ""}
                  <Link href={`/cars/${item.slug}`}>{displayName(item)}</Link>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Sign({ verdict }: { verdict: Verdict }) {
  const label = labels.advice[verdict];
  if (verdict === "best") {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" role="img" aria-label={label}>
        <circle cx="11" cy="11" r="10" fill="var(--accent)" />
        <path d="M6 11.2 9.2 14.4 16 7.6" fill="none" stroke="#fff" strokeWidth="1.8" />
      </svg>
    );
  }
  if (verdict === "ok") {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" role="img" aria-label={label}>
        <rect x="1" y="1" width="20" height="20" rx="3" fill="var(--accent)" />
        <text x="11" y="16" textAnchor="middle" fill="#fff" fontSize="14" fontFamily="sans-serif">
          i
        </text>
      </svg>
    );
  }
  if (verdict === "caution") {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" role="img" aria-label={label}>
        <path d="M11 2 20.5 19.5H1.5Z" fill="var(--warning)" />
        <text x="11" y="17" textAnchor="middle" fill="var(--bg-primary)" fontSize="12" fontFamily="sans-serif">
          !
        </text>
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" role="img" aria-label={label}>
      <circle cx="11" cy="11" r="10" fill="var(--danger)" />
      <rect x="4" y="9" width="14" height="4" rx="1" fill="#fff" />
    </svg>
  );
}
