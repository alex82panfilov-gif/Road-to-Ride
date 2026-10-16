import assert from "node:assert/strict";
import test from "node:test";
import { catalog } from "../data.ts";
import { bestAt } from "../market.ts";
import { tierAmounts, tierFloor } from "../tiers.ts";
import {
  bestSafeAt,
  catalogBands,
  choiceDiffs,
  nextJumpAfter,
  nextQualityAt,
  plateauUntil,
  shownSavings,
} from "./market.ts";

test("at 500000 bestSafeAt does not return Solaris or Rio", () => {
  const safe = bestSafeAt(catalog, 500_000);
  assert.notEqual(safe?.slug, "hyundai-solaris-1");
  assert.notEqual(safe?.slug, "kia-rio-3");
});

test("bestSafeAt drops an avoid car that bestAt would choose", () => {
  const solaris = catalog.find((item) => item.slug === "hyundai-solaris-1");
  const fusion = catalog.find((item) => item.slug === "ford-fusion");
  assert.ok(solaris && fusion);
  const cheap = { ...solaris, median: 400_000, score: 9.9 };
  const items = [cheap, fusion];
  assert.equal(bestAt(items, 500_000)?.slug, "hyundai-solaris-1");
  assert.notEqual(bestSafeAt(items, 500_000)?.slug, "hyundai-solaris-1");
  assert.equal(bestSafeAt(items, 500_000)?.slug, "ford-fusion");
});

test("bestSafeAt drops a car whose best gearbox is avoid", () => {
  const fusion = catalog.find((item) => item.slug === "ford-fusion");
  assert.ok(fusion);
  const bad = { ...fusion, bestGearbox: "avoid" as const, score: 9 };
  assert.equal(bestAt([bad], 500_000)?.slug, fusion.slug);
  assert.equal(bestSafeAt([bad], 500_000), null);
});

test("320000 stays the exact piggy amount", () => {
  assert.equal(shownSavings(320_000), 320_000);
  assert.notEqual(shownSavings(320_000), tierFloor(320_000));
  const bands = catalogBands(catalog, 320_000, 0, 0.007);
  assert.ok(bands.pocket.some((item) => item.slug === "kia-spectra"));
  assert.ok(bands.pocket.every((item) => item.median <= 320_000));
  assert.ok(bands.skip.every((item) => item.median <= 320_000));
});

test("nextJumpAfter is null on the plateau and names the later rise", () => {
  assert.equal(nextJumpAfter(catalog, 320_000), null);
  assert.equal(plateauUntil(catalog, 320_000), 650_000);
  assert.equal(nextQualityAt(catalog, 320_000), 660_000);
});

test("a sweet spot inside 150000 is a jump", () => {
  assert.equal(nextJumpAfter(catalog, 150_000), 200_000);
});

test("caution cars stay available", () => {
  assert.equal(bestSafeAt(catalog, 150_000)?.slug, "daewoo-matiz");
});

test("Focus III is not the safe choice where it is affordable", () => {
  assert.notEqual(bestSafeAt(catalog, 700_000)?.slug, "ford-focus-3");
});

test("tier marks where bestAt and bestSafeAt differ", () => {
  const diffs = choiceDiffs(catalog, tierAmounts());
  assert.deepEqual(diffs, []);
});
