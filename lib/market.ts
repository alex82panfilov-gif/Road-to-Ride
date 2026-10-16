import type { Model, PriceSnapshot, SubScores } from "./schema";
import { modelScore, scoreBand } from "./score";
import { levelForAmount, nextTierAmount, TIER_MAX, tierAmounts, tierFloor } from "./tiers";

export type Confidence = PriceSnapshot["confidence"];

export type CatalogItem = {
  slug: string;
  aliases: string[];
  brand: string;
  model: string;
  generation: string;
  years: [number, number];
  body: Model["body"];
  summary: string;
  fuelLPer100: number;
  hp: number;
  score: number;
  subScores: SubScores;
  median: number;
  p25: number;
  p75: number;
  medianMileageKm: number;
  medianYear: number;
  confidence: Confidence;
  sampleSize: number;
  month: string;
  notes?: string;
  isSeed: boolean;
  isFallback: boolean;
  bestGearbox: Model["gearboxes"][number]["verdict"];
};

export type PricePoint = {
  month: string;
  p25: number;
  median: number;
  p75: number;
  medianMileageKm: number;
  confidence: Confidence;
  sampleSize: number;
};

const GEARBOX_RANK = { recommended: 3, acceptable: 2, avoid: 1 } as const;

export function bestGearbox(model: Model): Model["gearboxes"][number]["verdict"] {
  return model.gearboxes.reduce((best, box) => (GEARBOX_RANK[box.verdict] > GEARBOX_RANK[best] ? box.verdict : best), model.gearboxes[0].verdict);
}

export function displayName(item: { brand: string; model: string; generation?: string }): string {
  return `${item.brand} ${item.model}`;
}

export function scoreLabel(score: number): string {
  const band = scoreBand(score);
  if (band === "top") return "отлично";
  if (band === "good") return "хорошо";
  if (band === "mid") return "нормально";
  return "осторожно";
}

export function bestAt(items: CatalogItem[], budget: number): CatalogItem | null {
  const affordable = items.filter((item) => item.median <= budget);
  if (!affordable.length) return null;
  return [...affordable].sort((a, b) => b.score - a.score || a.median - b.median || a.slug.localeCompare(b.slug, "ru"))[0];
}

export function affordableAt(items: CatalogItem[], budget: number): CatalogItem[] {
  return items
    .filter((item) => item.median <= budget)
    .sort((a, b) => b.score - a.score || a.median - b.median);
}

export function openedAt(items: CatalogItem[], budget: number): CatalogItem | null {
  const previous = tierFloor(budget);
  const fresh = items.filter((item) => item.median > previous && item.median <= budget);
  if (!fresh.length) return bestAt(items, budget);
  return [...fresh].sort((a, b) => b.score - a.score || a.median - b.median)[0];
}

export type TierStep = {
  amount: number;
  level: number;
  best: CatalogItem | null;
  score: number;
};

export function firstPricedTier(items: CatalogItem[]): number {
  const priced = items.filter((item) => item.median > 0 && item.median <= TIER_MAX);
  if (!priced.length) return TIER_MAX;
  const cheapest = Math.min(...priced.map((item) => item.median));
  return tierAmounts().find((amount) => amount >= cheapest) ?? TIER_MAX;
}

export function tierLadder(items: CatalogItem[]): TierStep[] {
  return tierAmounts().map((amount) => {
    const best = bestAt(items, amount);
    return { amount, level: levelForAmount(amount), best, score: best?.score ?? 0 };
  });
}

export function sweetSpotAmounts(items: CatalogItem[], minimumJump = 0.4): number[] {
  const ladder = tierLadder(items);
  const jumps: number[] = [];
  for (let index = 1; index < ladder.length; index++) {
    if (ladder[index].score - ladder[index - 1].score >= minimumJump) jumps.push(ladder[index].amount);
  }
  return jumps;
}

export type TierComparison = {
  currentBudget: number;
  nextBudget: number | null;
  current: CatalogItem | null;
  next: CatalogItem | null;
  scoreDelta: number;
  mileageDelta: number;
  gearboxImproved: boolean;
};

export function compareTiers(items: CatalogItem[], budget: number): TierComparison {
  const currentBudget = budget < 150_000 ? 0 : tierFloor(budget);
  const current = currentBudget ? bestAt(items, currentBudget) : null;
  let nextBudget = nextTierAmount(budget);
  let next = nextBudget ? bestAt(items, nextBudget) : null;
  while (nextBudget && !next) {
    const further = nextTierAmount(nextBudget);
    if (!further) break;
    nextBudget = further;
    next = bestAt(items, nextBudget);
  }
  const gearboxRank = { avoid: 1, acceptable: 2, recommended: 3 };
  return {
    currentBudget,
    nextBudget,
    current,
    next,
    scoreDelta: (next?.score ?? 0) - (current?.score ?? 0),
    mileageDelta: (current?.medianMileageKm ?? 0) - (next?.medianMileageKm ?? 0),
    gearboxImproved: Boolean(next && current && gearboxRank[next.bestGearbox] > gearboxRank[current.bestGearbox]),
  };
}

export function findModel<T extends { slug: string; aliases?: string[] }>(items: T[], slug: string): T | undefined {
  const key = slug.trim().toLowerCase();
  return items.find((item) => item.slug === key || item.aliases?.includes(key));
}
