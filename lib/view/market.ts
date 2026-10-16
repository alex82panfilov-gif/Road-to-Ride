import { adviseFor, type AdviceModel } from "../advice";
import { monthsToGoal } from "../forecast";
import { realPrice, type DriverProfile } from "../meta";
import {
  bestAt,
  sweetSpotAmounts,
  type CatalogItem,
  type TierComparison,
} from "../market";
import { nextTierAmount, TIER_MAX, tierAmounts, tierFloor } from "../tiers";

const SCORE_STEP = 0.5;
const WAIT_WINDOW = 150_000;
const GEARBOX_RANK = { avoid: 1, acceptable: 2, recommended: 3 } as const;

export type SnapKind = "sweet" | "gearbox";
export type SnapPoint = { amount: number; kind: SnapKind };

export type CatalogBands = {
  pocket: CatalogItem[];
  soon: CatalogItem[];
  skip: CatalogItem[];
  later: CatalogItem[];
};

function toAdvice(item: CatalogItem): AdviceModel {
  return {
    slug: item.slug,
    budgetRules: item.budgetRules,
    gearboxes: item.gearboxes,
    mileage: item.mileage,
    subScores: item.subScores,
    price: { median: item.median, medianMileageKm: item.medianMileageKm },
  };
}

function blocked(item: CatalogItem, model: AdviceModel, amount: number, all: AdviceModel[]): boolean {
  if (item.bestGearbox === "avoid") return true;
  return adviseFor(model, amount, all)?.verdict === "avoid";
}

/** Точная сумма копилки. Её нельзя подменять ближайшей отметкой уровня. */
export function shownSavings(saved: number): number {
  return saved;
}

export function bestSafeAt(items: CatalogItem[], amount: number): CatalogItem | null {
  const models = items.map(toAdvice);
  const safe = items.filter((item, index) => !blocked(item, models[index], amount, models));
  return bestAt(safe, amount);
}

export function qualityJumped(current: CatalogItem | null, next: CatalogItem | null): boolean {
  if (!next) return false;
  if (!current) return true;
  const scoreUp = next.score - current.score >= SCORE_STEP - 1e-9;
  const boxUp = GEARBOX_RANK[next.bestGearbox] > GEARBOX_RANK[current.bestGearbox];
  return scoreUp || boxUp;
}

function watchAmounts(items: CatalogItem[]): number[] {
  const values = new Set<number>(tierAmounts());
  for (const item of items) {
    if (item.median > 0 && item.median <= TIER_MAX) values.add(item.median);
  }
  return [...values].sort((left, right) => left - right);
}

export function nextJumpAfter(items: CatalogItem[], amount: number): number | null {
  const current = bestSafeAt(items, amount);
  const cap = amount + WAIT_WINDOW;
  for (const spot of sweetSpotAmounts(items)) {
    if (spot <= amount || spot > cap) continue;
    if (qualityJumped(current, bestSafeAt(items, spot))) return spot;
  }
  return null;
}

/** Последняя сумма, на которой лучший безопасный вариант ещё не лучше текущего. */
export function plateauUntil(items: CatalogItem[], amount: number): number {
  const current = bestSafeAt(items, amount);
  let flat = amount;
  for (const step of watchAmounts(items)) {
    if (step <= amount) continue;
    if (qualityJumped(current, bestSafeAt(items, step))) return flat;
    flat = step;
  }
  return flat;
}

/** Ближайшая сумма, где качество реально вырастает, без окна в 150 000 ₽. */
export function nextQualityAt(items: CatalogItem[], amount: number): number | null {
  const current = bestSafeAt(items, amount);
  for (const step of watchAmounts(items)) {
    if (step <= amount) continue;
    if (qualityJumped(current, bestSafeAt(items, step))) return step;
  }
  return null;
}

export function compareSafeTiers(items: CatalogItem[], budget: number): TierComparison {
  const currentBudget = budget < 150_000 ? 0 : tierFloor(budget);
  const current = currentBudget ? bestSafeAt(items, currentBudget) : null;
  let nextBudget = nextTierAmount(budget);
  let next = nextBudget ? bestSafeAt(items, nextBudget) : null;
  while (nextBudget && !next) {
    const further = nextTierAmount(nextBudget);
    if (!further) break;
    nextBudget = further;
    next = bestSafeAt(items, nextBudget);
  }
  return {
    currentBudget,
    nextBudget,
    current,
    next,
    scoreDelta: (next?.score ?? 0) - (current?.score ?? 0),
    mileageDelta: (current?.medianMileageKm ?? 0) - (next?.medianMileageKm ?? 0),
    gearboxImproved: Boolean(next && current && GEARBOX_RANK[next.bestGearbox] > GEARBOX_RANK[current.bestGearbox]),
  };
}

export function snapPoints(items: CatalogItem[]): SnapPoint[] {
  const spots = new Set(sweetSpotAmounts(items));
  const models = items.map(toAdvice);
  const points: SnapPoint[] = [];
  const amounts = tierAmounts();
  for (let index = 0; index < amounts.length; index += 1) {
    const amount = amounts[index];
    const previous = index === 0 ? 0 : amounts[index - 1];
    const sweet = spots.has(amount) && qualityJumped(bestSafeAt(items, previous), bestSafeAt(items, amount));
    const previousBest = bestAt(items, previous);
    const currentBest = bestAt(items, amount);
    const previousModel = previousBest ? models.find((model) => model.slug === previousBest.slug) : undefined;
    const currentModel = currentBest ? models.find((model) => model.slug === currentBest.slug) : undefined;
    const leftAvoid = Boolean(
      previousBest &&
        previousModel &&
        currentBest &&
        currentModel &&
        blocked(previousBest, previousModel, previous, models) &&
        !blocked(currentBest, currentModel, amount, models),
    );
    if (sweet) points.push({ amount, kind: "sweet" });
    else if (leftAvoid) points.push({ amount, kind: "gearbox" });
  }
  return points;
}

export function roadWindow(amount: number, expanded: boolean): { behind: number[]; ahead: number[]; onPost: boolean } {
  const posts = tierAmounts();
  const behind = posts.filter((post) => post < amount);
  const ahead = posts.filter((post) => post > amount);
  return {
    behind: expanded ? behind : behind.slice(-3),
    ahead: expanded ? ahead : ahead.slice(0, 3),
    onPost: posts.includes(amount),
  };
}

export function familyContribution(deposits: { amount: number; by: string }[]): number {
  return deposits.reduce((sum, deposit) => sum + (deposit.by === "me" ? 0 : deposit.amount), 0);
}

export function leftForCar(saved: number, car: CatalogItem | null, driver: DriverProfile): number | null {
  if (!car) return null;
  return saved - (realPrice(car.median, car.hp, driver) - car.median);
}

export function priceStatus(item: { isSeed: boolean; isFallback: boolean; confidence: string }): string[] {
  const lines: string[] = [];
  if (item.isSeed) lines.push("Стартовый ориентир");
  if (item.confidence === "low") lines.push("Мало данных");
  if (item.isFallback) lines.push("Цена прошлого месяца");
  return lines;
}

export function catalogBands(items: CatalogItem[], saved: number, monthly: number, inflation: number): CatalogBands {
  const models = items.map(toAdvice);
  const pocket: CatalogItem[] = [];
  const soon: CatalogItem[] = [];
  const skip: CatalogItem[] = [];
  const later: CatalogItem[] = [];
  items.forEach((item, index) => {
    const avoid = blocked(item, models[index], saved, models);
    if (item.median <= saved && avoid) {
      skip.push(item);
      return;
    }
    if (item.median <= saved) {
      pocket.push(item);
      return;
    }
    const months = monthsToGoal(saved, monthly, item.median, inflation);
    if (!avoid && months !== null && months >= 1 && months <= 4) {
      soon.push(item);
      return;
    }
    later.push(item);
  });
  const byScore = (left: CatalogItem, right: CatalogItem) => right.score - left.score || left.median - right.median;
  pocket.sort(byScore);
  soon.sort(byScore);
  skip.sort(byScore);
  later.sort(byScore);
  return { pocket, soon, skip, later };
}

export function choiceDiffs(items: CatalogItem[], amounts: number[]) {
  return amounts.flatMap((amount) => {
    const raw = bestAt(items, amount);
    const safe = bestSafeAt(items, amount);
    if ((raw?.slug ?? null) === (safe?.slug ?? null)) return [];
    return [{ amount, bestAt: raw?.slug ?? null, bestSafeAt: safe?.slug ?? null }];
  });
}
