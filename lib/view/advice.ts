import { adviseFor, type Advice, type AdviceModel } from "../advice";
import { DEFAULT_DRIVER, type DriverProfile } from "../meta";
import type { CatalogItem } from "../market";
import { purchasePrice } from "./market";

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

const PRICE_BAND = 0.1;

export function isAvoidCar(item: CatalogItem, items: CatalogItem[]): boolean {
  if (item.bestGearbox === "avoid") return true;
  return adviceForCar(item, items)?.verdict === "avoid";
}

/** Подпись вместо цвета «отлично», когда машину лучше не брать. */
export function avoidExcuse(item: {
  median: number;
  bestGearbox: string;
  gearboxes: { type: string; verdict: string }[];
  budgetRules?: CatalogItem["budgetRules"];
}): string | null {
  const gearboxOnCard =
    item.bestGearbox === "avoid" || !item.gearboxes.some((box) => box.type !== "MT" && box.verdict !== "avoid");
  const active = (item.budgetRules ?? []).filter(
    (rule) => rule.verdict === "avoid" && item.median >= rule.from && item.median <= rule.to,
  );
  const taxi = active.some((rule) => /такси/i.test(rule.reason));
  const gearbox = gearboxOnCard || active.some((rule) => /короб|робот|powershift|вариатор/i.test(rule.reason));
  if (!gearbox && !taxi) return active.length ? "если бы не коробка/такси" : null;
  if (gearbox && taxi) return "если бы не коробка/такси";
  return gearbox ? "если бы не коробка" : "если бы не такси";
}

/**
 * 1–2 машины без avoid рядом по реальной цене.
 * Сначала insteadSlugs, если они проходят окно; иначе тот же кузов и более высокая оценка.
 */
export function alternativesFor(
  item: CatalogItem,
  items: CatalogItem[],
  saved: number,
  driver: DriverProfile = DEFAULT_DRIVER,
): CatalogItem[] {
  const price = purchasePrice(item, driver);
  const unaffordable = price > saved;
  const fits = (other: CatalogItem) => {
    if (other.slug === item.slug || other.median <= 0 || isAvoidCar(other, items)) return false;
    const otherPrice = purchasePrice(other, driver);
    if (unaffordable) return otherPrice <= saved;
    if (price <= 0) return false;
    return Math.abs(otherPrice - price) / price <= PRICE_BAND;
  };
  const open = items.filter(fits);
  const rank = (list: CatalogItem[]) =>
    [...list].sort(
      (left, right) =>
        Number(right.body === item.body) - Number(left.body === item.body) ||
        right.score - left.score ||
        left.slug.localeCompare(right.slug, "ru"),
    );
  const slugs = new Set((item.budgetRules ?? []).flatMap((rule) => rule.insteadSlugs ?? []));
  const preferred = rank(open.filter((other) => slugs.has(other.slug))).slice(0, 2);
  if (preferred.length) return preferred;
  return rank(open).slice(0, 2);
}

/** Правило «дешевле N» больше не помечает машину, но строка о ловушке остаётся. */
export function cheaperTrap(item: { median: number; budgetRules?: CatalogItem["budgetRules"] }): string | null {
  if (!item.median) return null;
  const rule = (item.budgetRules ?? []).find((entry) => entry.verdict === "avoid" && item.median > entry.to);
  return rule?.reason ?? null;
}
