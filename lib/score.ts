import type { SubScores } from "./schema";

export const SCORE_WEIGHTS = {
  reliability: 0.3,
  purchaseRisk: 0.2,
  ownershipCost: 0.2,
  safety: 0.15,
  liquidity: 0.15,
} as const;

export type Scored = { subScores: SubScores };

/** Итог 0–10. Выше — лучше по всем пяти критериям, включая «риск покупки». */
export function modelScore(scores: SubScores): number {
  const total = (Object.keys(SCORE_WEIGHTS) as (keyof typeof SCORE_WEIGHTS)[]).reduce(
    (acc, key) => acc + scores[key] * SCORE_WEIGHTS[key],
    0,
  );
  return Math.round(total * 10) / 10;
}

export type PricedModel = Scored & { median: number };

/** Лучшая модель, чья медиана укладывается в бюджет. Пустой бюджет даёт 0. */
export function tierScore(budget: number, models: PricedModel[]): number {
  return Math.max(0, ...models.filter((model) => model.median <= budget).map((model) => modelScore(model.subScores)));
}

export function scoreBand(score: number): "low" | "mid" | "good" | "top" {
  if (score >= 7.5) return "top";
  if (score >= 6) return "good";
  if (score >= 4.5) return "mid";
  return "low";
}
