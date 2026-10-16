import type { TSnapshotFile } from "./schema";

/** Последняя пригодная цена: снимок с 5 и более объявлениями. Стартовый ориентир — только если другого нет. */
export function pickPrice(slug: string, files: TSnapshotFile[]) {
  const sorted = [...files].sort((a, b) => b.month.localeCompare(a.month));
  const latest = sorted[0]?.month;
  for (const file of sorted) {
    const snapshot = file.snapshots.find((item) => item.slug === slug);
    if (!snapshot) continue;
    if (!file.seed && (snapshot.listings?.length ?? 0) < 5) continue;
    return { ...snapshot, isSeed: !!file.seed, isFallback: file.month !== latest };
  }
  return null;
}

export type PickedPrice = NonNullable<ReturnType<typeof pickPrice>>;
