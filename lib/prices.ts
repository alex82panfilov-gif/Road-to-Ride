import type { TSnapshot, TSnapshotFile } from "./schema";

/** Столько проверенных объявлений нужно, чтобы цена модели перестала быть стартовым ориентиром. */
export const MIN_LIVE_LISTINGS = 5;

export function listingCount(snapshot: Pick<TSnapshot, "listings">): number {
  return snapshot.listings?.length ?? 0;
}

export function isLivePrice(snapshot: Pick<TSnapshot, "listings">): boolean {
  return listingCount(snapshot) >= MIN_LIVE_LISTINGS;
}

/** Последняя пригодная цена этой модели. Пять объявлений делают живой её одну, даже если месяц ещё seed. */
export function pickPrice(slug: string, files: TSnapshotFile[]) {
  const sorted = [...files].sort((a, b) => b.month.localeCompare(a.month));
  const latest = sorted[0]?.month;
  for (const file of sorted) {
    const snapshot = file.snapshots.find((item) => item.slug === slug);
    if (!snapshot) continue;
    const live = isLivePrice(snapshot);
    if (!file.seed && !live) continue;
    return { ...snapshot, isSeed: !!file.seed && !live, isFallback: file.month !== latest };
  }
  return null;
}

export type PickedPrice = NonNullable<ReturnType<typeof pickPrice>>;
