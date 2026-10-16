import { scoreText } from "../cn";
import { monthsToGoal } from "../forecast";
import { approxRub } from "../format";
import { DEFAULT_DRIVER, type DriverProfile } from "../meta";
import type { CatalogItem } from "../market";
import { isAvoidCar } from "./advice";
import { purchasePrice, rareInMoscow } from "./market";

export const goalBandOrder = ["pocket", "three", "year", "longer", "million", "avoid"] as const;
export type GoalBand = (typeof goalBandOrder)[number];

export const goalBandTitle: Record<GoalBand, string> = {
  pocket: "Уже по карману",
  three: "До 3 мес.",
  year: "До года",
  longer: "Дольше года",
  million: "Дороже 1 млн",
  avoid: "Не рекомендуем",
};

export function goalLabel(item: CatalogItem, driver: DriverProfile = DEFAULT_DRIVER): string {
  const years = `${item.years[0]}–${item.years[1]}`;
  const generation = item.generation.includes(String(item.years[0])) ? item.generation : `${item.generation} (${years})`;
  return `${item.brand} ${item.model} ${generation} · ${approxRub(purchasePrice(item, driver))} · ${scoreText(item.score)}`;
}

export function goalGroups(
  items: CatalogItem[],
  saved: number,
  monthly: number,
  inflation: number,
  driver: DriverProfile = DEFAULT_DRIVER,
): { id: GoalBand; title: string; items: CatalogItem[] }[] {
  const buckets: Record<GoalBand, CatalogItem[]> = {
    pocket: [],
    three: [],
    year: [],
    longer: [],
    million: [],
    avoid: [],
  };
  const priced = items.filter((item) => item.median > 0).sort((left, right) => purchasePrice(left, driver) - purchasePrice(right, driver));
  for (const item of priced) {
    if (rareInMoscow(item)) continue;
    if (isAvoidCar(item, items)) {
      buckets.avoid.push(item);
      continue;
    }
    const price = purchasePrice(item, driver);
    if (price > 1_000_000) {
      buckets.million.push(item);
      continue;
    }
    if (price <= saved) {
      buckets.pocket.push(item);
      continue;
    }
    const months = monthsToGoal(saved, monthly, price, inflation);
    if (months !== null && months <= 3) buckets.three.push(item);
    else if (months !== null && months <= 12) buckets.year.push(item);
    else buckets.longer.push(item);
  }
  return goalBandOrder.filter((id) => buckets[id].length).map((id) => ({ id, title: goalBandTitle[id], items: buckets[id] }));
}
