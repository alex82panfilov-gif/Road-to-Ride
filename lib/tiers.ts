export const TIER_MIN = 150_000;
export const TIER_MAX = 1_000_000;
export const TIER_STEP = 50_000;
export const TIER_COUNT = 18;

export function tierAmounts(): number[] {
  return Array.from({ length: TIER_COUNT }, (_, index) => TIER_MIN + index * TIER_STEP);
}

export function isTierAmount(amount: number): boolean {
  return tierAmounts().includes(amount);
}

/** 0 — ещё не дотянули до 150 000. Дальше 1…18. */
export function levelForAmount(amount: number): number {
  if (amount < TIER_MIN) return 0;
  const level = Math.floor((Math.min(amount, TIER_MAX) - TIER_MIN) / TIER_STEP) + 1;
  return Math.min(TIER_COUNT, level);
}

export function amountForLevel(level: number): number {
  if (level <= 0) return 0;
  return TIER_MIN + (Math.min(level, TIER_COUNT) - 1) * TIER_STEP;
}

/** Нижняя граница текущего уровня. Ниже 150 000 — 0. */
export function tierFloor(amount: number): number {
  const level = levelForAmount(amount);
  return amountForLevel(level);
}

export function nextTierAmount(amount: number): number | null {
  const floor = tierFloor(amount);
  if (amount < TIER_MIN) return TIER_MIN;
  if (floor >= TIER_MAX) return null;
  return floor + TIER_STEP;
}

/** Доля пути до следующего уровня, 0–1. На максимуме — 1. */
export function progressToNextTier(amount: number): number {
  if (amount >= TIER_MAX) return 1;
  const target = nextTierAmount(amount) ?? TIER_MAX;
  const floor = tierFloor(amount);
  const span = target - floor;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (amount - floor) / span));
}
