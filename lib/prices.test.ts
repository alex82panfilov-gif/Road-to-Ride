import assert from "node:assert/strict";
import test from "node:test";
import { pickPrice } from "./prices.ts";
import type { TSnapshot, TSnapshotFile } from "./schema.ts";

function snapshot(slug: string, listings: number, median: number): TSnapshot {
  return {
    month: "2026-10",
    slug,
    region: "moscow",
    sampleSize: listings,
    p25: median,
    median,
    p75: median,
    medianMileageKm: 100_000,
    medianYear: 2006,
    confidence: "low",
    sources: ["https://www.autostat.ru/"],
    ...(listings
      ? {
          listings: Array.from({ length: listings }, (_, index) => ({
            id: `${slug}-${index}`,
            platform: "drom" as const,
            year: 2006,
            mileageKm: 100_000,
            priceRub: median,
            engineL: 1.6,
            gearboxType: "AT" as const,
            gearboxRaw: "4АКПП",
          })),
        }
      : {}),
  };
}

function month(seed: boolean, snapshots: TSnapshot[], label = "2026-10"): TSnapshotFile {
  return {
    schemaVersion: 2,
    month: label,
    generatedAt: "2026-10-16T09:00:00.000Z",
    seed,
    marketSummary: { trend: "тест", sources: ["https://www.autostat.ru/"] },
    snapshots: snapshots.map((item) => ({ ...item, month: label })),
    newModels: [],
    flags: [],
  };
}

test("six Elantra listings are a live price while Matiz with none stays a seed", () => {
  const file = month(true, [snapshot("hyundai-elantra-xd", 6, 250_000), snapshot("daewoo-matiz", 0, 150_000)]);
  const elantra = pickPrice("hyundai-elantra-xd", [file]);
  const matiz = pickPrice("daewoo-matiz", [file]);
  assert.equal(elantra?.isSeed, false);
  assert.equal(elantra?.median, 250_000);
  assert.equal(matiz?.isSeed, true);
  assert.equal(matiz?.median, 150_000);
});

test("four listings in a seed month are still a starting orientir", () => {
  const file = month(true, [snapshot("hyundai-elantra-xd", 4, 240_000)]);
  assert.equal(pickPrice("hyundai-elantra-xd", [file])?.isSeed, true);
});

test("a thin measured month falls back to the older orientir", () => {
  const older = month(true, [snapshot("hyundai-elantra-xd", 0, 200_000)], "2026-09");
  const newer = month(false, [snapshot("hyundai-elantra-xd", 2, 280_000)], "2026-10");
  const price = pickPrice("hyundai-elantra-xd", [older, newer]);
  assert.equal(price?.median, 200_000);
  assert.equal(price?.isSeed, true);
  assert.equal(price?.isFallback, true);
});
