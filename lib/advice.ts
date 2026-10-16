import type { BudgetRule, SubScores } from "./schema";
import { modelScore } from "./score";

export type Verdict = "best" | "ok" | "caution" | "avoid";
export type PriceView = { median: number; medianMileageKm: number };

export type AdviceModel = {
  slug: string;
  budgetRules?: BudgetRule[];
  gearboxes: { type: string; verdict: string }[];
  mileage: { avoidFrom: number };
  subScores: SubScores;
  price: PriceView | null;
};

export type Advice = { verdict: Verdict; reasons: string[]; insteadSlugs: string[] };

const rank: Record<Verdict, number> = { best: 0, ok: 0, caution: 1, avoid: 2 };

export function adviseFor(model: AdviceModel, budget: number, all: AdviceModel[]): Advice | null {
  if (!model.price) return null;
  let verdict: Verdict = "ok";
  const reasons: string[] = [];
  const instead = new Set<string>();
  const raise = (next: Verdict, why: string) => {
    if (rank[next] > rank[verdict]) verdict = next;
    reasons.push(why);
  };

  for (const rule of model.budgetRules ?? []) {
    if (budget >= rule.from && budget <= rule.to) {
      raise(rule.verdict, rule.reason);
      rule.insteadSlugs?.forEach((slug) => instead.add(slug));
    }
  }

  if (!model.gearboxes.some((gearbox) => gearbox.type !== "MT" && gearbox.verdict !== "avoid")) {
    raise("avoid", "Нет надёжной автоматической коробки");
  }

  if (model.price.medianMileageKm >= model.mileage.avoidFrom) {
    raise("caution", `Типичный пробег ${Math.round(model.price.medianMileageKm / 1000)} тыс. км — выше нормы для модели`);
  }

  const score = modelScore(model.subScores);
  if (score < 3) raise("caution", "Подходит только как временная машина");

  const better = all
    .filter((other) => other.slug !== model.slug && other.price && other.price.median <= budget && modelScore(other.subScores) >= score + 1)
    .sort((left, right) => modelScore(right.subScores) - modelScore(left.subScores))
    .slice(0, 2);
  if (better.length) {
    reasons.push("За эти деньги есть варианты лучше");
    better.forEach((item) => instead.add(item.slug));
  }

  return { verdict, reasons, insteadSlugs: [...instead] };
}

export function markBest(items: { m: AdviceModel; advice: Advice | null }[], budget: number) {
  const ok = items.filter((item) => item.advice?.verdict === "ok" && item.m.price && item.m.price.median <= budget);
  const top = [...ok].sort((left, right) => modelScore(right.m.subScores) - modelScore(left.m.subScores))[0];
  if (top?.advice) top.advice.verdict = "best";
  return items;
}

export function trapsFor<T extends { priceRange: [number, number] }>(traps: T[], budget: number) {
  return traps.filter((trap) => budget >= trap.priceRange[0] && budget <= trap.priceRange[1] * 1.1);
}
