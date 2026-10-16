import { adviseFor, type Advice, type AdviceModel } from "../advice";
import type { CatalogItem } from "../market";

function toAdvice(item: CatalogItem): AdviceModel {
  return {
    slug: item.slug,
    budgetRules: item.budgetRules,
    gearboxes: item.gearboxes,
    mileage: item.mileage,
    subScores: item.subScores,
    price: item.median > 0 ? { median: item.median, medianMileageKm: item.medianMileageKm } : null,
  };
}

/** Вердикт по цене самой машины, а не по сумме в копилке. */
export function adviceForCar(item: CatalogItem, items: CatalogItem[]): Advice | null {
  const models = items.map(toAdvice);
  return adviseFor(toAdvice(item), item.median, models);
}

/** Правило «дешевле N» больше не помечает машину, но строка о ловушке остаётся. */
export function cheaperTrap(item: { median: number; budgetRules?: CatalogItem["budgetRules"] }): string | null {
  if (!item.median) return null;
  const rule = (item.budgetRules ?? []).find((entry) => entry.verdict === "avoid" && item.median > entry.to);
  return rule?.reason ?? null;
}
