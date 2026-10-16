import { adviseFor, type AdviceModel } from "../advice";
import { scoreText } from "../cn";
import { monthsToGoal } from "../forecast";
import { approxRub } from "../format";
import { DEFAULT_DRIVER, meta, osagoRange, realPrice, type DriverProfile } from "../meta";
import {
  bestAt,
  displayName,
  sweetSpotAmounts,
  type CatalogItem,
  type TierComparison,
} from "../market";
import { nextTierAmount, tierAmounts, tierFloor } from "../tiers";

const SCORE_STEP = 0.5;
const WAIT_WINDOW = 150_000;
/** Ниже этой оценки вторая карточка сравнивает две цели, а не одну ближайшую. */
export const DECENT_SCORE = 4.5;
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

/** Сколько нужно на машину с ОСАГО, учётом, ТО и резервом. Медиана остаётся ценой рынка. */
export function purchasePrice(item: CatalogItem, driver: DriverProfile = DEFAULT_DRIVER): number {
  return realPrice(item.median, item.hp, driver);
}

export type PriceBreakdown = {
  median: number;
  osago: number;
  registration: number;
  diagnostic: number;
  service: number;
  reserve: number;
  reserveRate: number;
  total: number;
};

/** Состав realPrice. Сумма строк равна purchasePrice. */
export function priceBreakdown(item: CatalogItem, driver: DriverProfile = DEFAULT_DRIVER): PriceBreakdown {
  const reserve = Math.round(item.median * meta.reserveRate);
  return {
    median: item.median,
    osago: osagoRange(item.hp, driver).mid,
    registration: meta.registrationRub,
    diagnostic: meta.diagnosticCardRub,
    service: meta.firstServiceRub,
    reserve,
    reserveRate: meta.reserveRate,
    total: purchasePrice(item, driver),
  };
}

function openModels(items: CatalogItem[], driver: DriverProfile): CatalogItem[] {
  const models = items.map(toAdvice);
  return items.filter((item, index) => item.median > 0 && !blocked(item, models[index], purchasePrice(item, driver), models));
}

function soonest(items: CatalogItem[], amount: number, driver: DriverProfile): CatalogItem | null {
  const ahead = items.filter((item) => purchasePrice(item, driver) > amount);
  if (!ahead.length) return null;
  return ahead.sort(
    (a, b) =>
      purchasePrice(a, driver) - purchasePrice(b, driver) ||
      b.score - a.score ||
      a.median - b.median ||
      a.slug.localeCompare(b.slug, "ru"),
  )[0];
}

/** Ближайшая модель, до которой ещё не хватает, по realPrice. */
export function nextWithinReach(items: CatalogItem[], amount: number, driver: DriverProfile = DEFAULT_DRIVER): CatalogItem | null {
  return soonest(openModels(items, driver), amount, driver);
}

/** «+3 мес. — и оценка 4,6 вместо 2,9». Пусто, если вторая цель не дальше первой. */
export function aimContrast(earlierMonths: number, earlierScore: number, laterMonths: number, laterScore: number): string | null {
  const months = laterMonths - earlierMonths;
  if (months <= 0) return null;
  return `+${months} мес. — и оценка ${scoreText(laterScore)} вместо ${scoreText(earlierScore)}`;
}

/** Ближайшая модель с оценкой не ниже DECENT_SCORE, по realPrice. */
export function nextDecentAt(items: CatalogItem[], amount: number, driver: DriverProfile = DEFAULT_DRIVER): CatalogItem | null {
  return soonest(
    openModels(items, driver).filter((item) => item.score >= DECENT_SCORE),
    amount,
    driver,
  );
}

/** Модели, которые можно купить на эту сумму: реальная цена не выше копилки. */
export function affordableReal(items: CatalogItem[], amount: number, driver: DriverProfile = DEFAULT_DRIVER): CatalogItem[] {
  return items.filter((item) => item.median > 0 && purchasePrice(item, driver) <= amount);
}

const ALMOST_RATE = 0.03;
/** Ниже этого разрыва оценка «почти» не повод ждать. */
export const ALMOST_SAME_SCORE = 0.3;
/** С этого разрыва недобор стоит месяца ожидания. */
export const ALMOST_WAIT_SCORE = 1.0;

/** Недобор меньше взноса или меньше 3% реальной цены. Стартовый ориентир грубее этой щели. */
export function almostAffordable(
  items: CatalogItem[],
  amount: number,
  monthly: number,
  driver: DriverProfile = DEFAULT_DRIVER,
): { item: CatalogItem; gap: number } | null {
  const candidates = openModels(items, driver)
    .map((item) => {
      const price = purchasePrice(item, driver);
      return { item, gap: price - amount, price };
    })
    .filter(({ gap, price }) => gap > 0 && gap <= Math.max(monthly, price * ALMOST_RATE));
  if (!candidates.length) return null;
  candidates.sort(
    (a, b) => b.item.score - a.item.score || a.gap - b.gap || a.item.slug.localeCompare(b.item.slug, "ru"),
  );
  return { item: candidates[0].item, gap: candidates[0].gap };
}

export function almostNote(
  item: CatalogItem,
  gap: number,
  monthly: number,
  todayScore: number | null = null,
  months: number | null = null,
): string {
  if (todayScore !== null) {
    const delta = item.score - todayScore;
    if (delta < ALMOST_SAME_SCORE) {
      return `${displayName(item)} почти по карману, но по оценке почти не отличается. Выбирайте по конкретному объявлению`;
    }
    if (delta >= ALMOST_WAIT_SCORE) {
      const wait = months !== null && months > 0 ? `, это около ${months} мес.` : "";
      return `За ${approxRub(gap)}${wait}, оценка ${scoreText(item.score)} вместо ${scoreText(todayScore)}. Стоит подождать`;
    }
  }
  const reason = gap <= monthly ? "это меньше одного взноса" : "это меньше 3% цены";
  return `${displayName(item)} — не хватает ${approxRub(gap)}, ${reason}`;
}

export function bestSafeAt(items: CatalogItem[], amount: number, driver: DriverProfile = DEFAULT_DRIVER): CatalogItem | null {
  const models = items.map(toAdvice);
  const priced = new Set(affordableReal(items, amount, driver).map((item) => item.slug));
  const safe = items.filter((item, index) => priced.has(item.slug) && !blocked(item, models[index], amount, models));
  return bestAt(safe, amount);
}

export function qualityJumped(current: CatalogItem | null, next: CatalogItem | null): boolean {
  if (!next) return false;
  if (!current) return true;
  const scoreUp = next.score - current.score >= SCORE_STEP - 1e-9;
  const boxUp = GEARBOX_RANK[next.bestGearbox] > GEARBOX_RANK[current.bestGearbox];
  return scoreUp || boxUp;
}

function watchAmounts(items: CatalogItem[], driver: DriverProfile): number[] {
  const values = new Set<number>(tierAmounts());
  for (const item of items) {
    if (item.median <= 0) continue;
    values.add(purchasePrice(item, driver));
  }
  return [...values].sort((left, right) => left - right);
}

export function nextJumpAfter(items: CatalogItem[], amount: number, driver: DriverProfile = DEFAULT_DRIVER): number | null {
  const current = bestSafeAt(items, amount, driver);
  const cap = amount + WAIT_WINDOW;
  for (const step of watchAmounts(items, driver)) {
    if (step <= amount || step > cap) continue;
    if (qualityJumped(current, bestSafeAt(items, step, driver))) return step;
  }
  return null;
}

/** Последняя сумма, на которой лучший безопасный вариант ещё не лучше текущего. */
export function plateauUntil(items: CatalogItem[], amount: number, driver: DriverProfile = DEFAULT_DRIVER): number {
  const current = bestSafeAt(items, amount, driver);
  let flat = amount;
  for (const step of watchAmounts(items, driver)) {
    if (step <= amount) continue;
    if (qualityJumped(current, bestSafeAt(items, step, driver))) return flat;
    flat = step;
  }
  return flat;
}

/** Ближайшая сумма, где качество реально вырастает, без окна в 150 000 ₽. */
export function nextQualityAt(items: CatalogItem[], amount: number, driver: DriverProfile = DEFAULT_DRIVER): number | null {
  const current = bestSafeAt(items, amount, driver);
  for (const step of watchAmounts(items, driver)) {
    if (step <= amount) continue;
    if (qualityJumped(current, bestSafeAt(items, step, driver))) return step;
  }
  return null;
}

export function compareSafeTiers(items: CatalogItem[], budget: number, driver: DriverProfile = DEFAULT_DRIVER): TierComparison {
  const currentBudget = budget < 150_000 ? 0 : tierFloor(budget);
  const current = currentBudget ? bestSafeAt(items, currentBudget, driver) : null;
  let nextBudget = nextTierAmount(budget);
  let next = nextBudget ? bestSafeAt(items, nextBudget, driver) : null;
  while (nextBudget && !next) {
    const further = nextTierAmount(nextBudget);
    if (!further) break;
    nextBudget = further;
    next = bestSafeAt(items, nextBudget, driver);
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

export function snapPoints(items: CatalogItem[], driver: DriverProfile = DEFAULT_DRIVER): SnapPoint[] {
  const spots = new Set(sweetSpotAmounts(items));
  const models = items.map(toAdvice);
  const points: SnapPoint[] = [];
  const amounts = tierAmounts();
  for (let index = 0; index < amounts.length; index += 1) {
    const amount = amounts[index];
    const previous = index === 0 ? 0 : amounts[index - 1];
    const sweet = spots.has(amount) && qualityJumped(bestSafeAt(items, previous, driver), bestSafeAt(items, amount, driver));
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

export function catalogBands(
  items: CatalogItem[],
  saved: number,
  monthly: number,
  inflation: number,
  driver: DriverProfile = DEFAULT_DRIVER,
): CatalogBands {
  const models = items.map(toAdvice);
  const pocket: CatalogItem[] = [];
  const soon: CatalogItem[] = [];
  const skip: CatalogItem[] = [];
  const later: CatalogItem[] = [];
  items.forEach((item, index) => {
    const avoid = blocked(item, models[index], saved, models);
    const price = item.median > 0 ? purchasePrice(item, driver) : Number.POSITIVE_INFINITY;
    if (price <= saved && avoid) {
      skip.push(item);
      return;
    }
    if (price <= saved) {
      pocket.push(item);
      return;
    }
    const months = monthsToGoal(saved, monthly, price, inflation);
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

export function choiceDiffs(items: CatalogItem[], amounts: number[], driver: DriverProfile = DEFAULT_DRIVER) {
  return amounts.flatMap((amount) => {
    const raw = bestAt(items, amount);
    const safe = bestSafeAt(items, amount, driver);
    if ((raw?.slug ?? null) === (safe?.slug ?? null)) return [];
    return [{ amount, bestAt: raw?.slug ?? null, bestSafeAt: safe?.slug ?? null }];
  });
}
