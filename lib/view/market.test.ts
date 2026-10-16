import assert from "node:assert/strict";
import test from "node:test";
import { catalog } from "../data.ts";
import { bestAt } from "../market.ts";
import { roundToThousands } from "../format.ts";
import { purchaseQuote, realPrice } from "../meta.ts";
import { tierFloor } from "../tiers.ts";
import {
  aimContrast,
  almostAffordable,
  almostNote,
  bestSafeAt,
  catalogBands,
  DECENT_SCORE,
  nextDecentAt,
  nextJumpAfter,
  nextWithinReach,
  priceBreakdown,
  purchasePrice,
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
  const bands = catalogBands(catalog, 320_000, 20_000, 0.007);
  assert.ok(bands.pocket.every((item) => purchasePrice(item) <= 320_000));
  assert.ok(bands.pocket.some((item) => item.slug === "hyundai-elantra-xd"));
  assert.ok(bands.pocket.every((item) => item.slug !== "kia-cerato-1"));
  assert.ok(bands.pocket.every((item) => item.slug !== "ford-fusion"));
  assert.ok(bands.soon.some((item) => item.slug === "kia-cerato-1"));
  assert.ok(bands.soon.some((item) => item.slug === "ford-fusion"));
});

test("at 320000 Elantra is affordable and Cerato is only short by less than a deposit", () => {
  assert.equal(bestSafeAt(catalog, 320_000)?.slug, "hyundai-elantra-xd");
  const almost = almostAffordable(catalog, 320_000, 20_000);
  assert.equal(almost?.item.slug, "kia-cerato-1");
  assert.ok(almost);
  assert.equal(roundToThousands(almost.gap), 1_000);
  assert.match(almostNote(almost.item, almost.gap, 20_000), /Cerato — не хватает/);
  assert.match(almostNote(almost.item, almost.gap, 20_000), /это меньше одного взноса/);
  assert.match(almostNote(almost.item, 25_000, 20_000), /это меньше 3% цены/);
  assert.ok(almost.gap <= Math.max(20_000, purchasePrice(almost.item) * 0.03));
});

test("at 320000 today is not Fusion because the real price is higher", () => {
  const fusion = catalog.find((item) => item.slug === "ford-fusion");
  assert.ok(fusion);
  const price = realPrice(fusion.median, fusion.hp);
  assert.equal(price, 374_312);
  assert.ok(price > 320_000);
  assert.notEqual(bestSafeAt(catalog, 320_000)?.slug, "ford-fusion");
  assert.equal(bestSafeAt(catalog, 320_000)?.slug, "hyundai-elantra-xd");
});

test("at 150000 Matiz is out of reach once startup costs are included", () => {
  const matiz = catalog.find((item) => item.slug === "daewoo-matiz");
  assert.ok(matiz);
  const price = purchasePrice(matiz);
  assert.ok(price > 150_000);
  assert.notEqual(bestSafeAt(catalog, 150_000)?.slug, "daewoo-matiz");
  assert.equal(bestSafeAt(catalog, 150_000), null);
});

test("nextJumpAfter 320000 reaches the real price of the next car", () => {
  const fusion = catalog.find((item) => item.slug === "ford-fusion");
  assert.ok(fusion);
  const jump = nextJumpAfter(catalog, 320_000);
  assert.ok(jump !== null);
  assert.ok(jump >= purchasePrice(fusion));
  assert.equal(bestSafeAt(catalog, jump)?.slug, "ford-fusion");
});

test("Focus III is not the safe choice where it is affordable", () => {
  assert.notEqual(bestSafeAt(catalog, 700_000)?.slug, "ford-focus-3");
});

test("at 0 the fork names Matiz and a car scored at least 4.5", () => {
  const nearest = nextWithinReach(catalog, 0);
  const decent = nextDecentAt(catalog, 0);
  assert.equal(nearest?.slug, "daewoo-matiz");
  assert.ok(decent);
  assert.ok(nearest);
  assert.ok(decent.score >= DECENT_SCORE);
  assert.notEqual(decent.slug, "daewoo-matiz");
  assert.ok(purchasePrice(decent) > purchasePrice(nearest));
  assert.equal(DECENT_SCORE, 4.5);
  const quoteMonths = (item: { median: number; hp: number }) =>
    purchaseQuote({
      median: item.median,
      hp: item.hp,
      driver: { age: 20, experienceYears: 0 },
      licenseDate: null,
      onParentPolicy: false,
      saved: 0,
      monthly: 20_000,
      inflation: 0.007,
      asOf: "2026-10-16",
    }).months;
  const earlier = quoteMonths(nearest);
  const later = quoteMonths(decent);
  assert.ok(earlier !== null && later !== null);
  assert.equal(aimContrast(earlier, nearest.score, later, decent.score), "+3 мес. — и оценка 4,6 вместо 2,9");
});

test("a purchase target rounds to thousands and the breakdown sums to the real price", () => {
  const matiz = catalog.find((item) => item.slug === "daewoo-matiz");
  assert.ok(matiz);
  const price = purchasePrice(matiz);
  assert.equal(roundToThousands(price), 204_000);
  const parts = priceBreakdown(matiz);
  assert.equal(parts.median + parts.osago + parts.registration + parts.diagnostic + parts.service + parts.reserve, parts.total);
  assert.equal(parts.total, price);
});

test("the Solaris 9.9 fixture still separates bestAt from bestSafeAt", () => {
  const solaris = catalog.find((item) => item.slug === "hyundai-solaris-1");
  const fusion = catalog.find((item) => item.slug === "ford-fusion");
  assert.ok(solaris && fusion);
  const cheap = { ...solaris, median: 400_000, score: 9.9 };
  assert.notEqual(bestAt([cheap, fusion], 500_000)?.slug, bestSafeAt([cheap, fusion], 500_000)?.slug);
});
