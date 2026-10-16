import assert from "node:assert/strict";
import test from "node:test";
import { catalog } from "../data.ts";
import { bestAt } from "../market.ts";
import { approxRub, roundToThousands } from "../format.ts";
import { purchaseQuote, realPrice } from "../meta.ts";
import { tierFloor } from "../tiers.ts";
import {
  aimContrast,
  ALMOST_WAIT_SCORE,
  almostAffordable,
  almostNote,
  bestSafeAt,
  catalogBands,
  rareInMoscow,
  rareLine,
  regionTransferNote,
  collapseRoadPosts,
  DECENT_SCORE,
  directSaveLine,
  nextDecentAt,
  nextJumpAfter,
  nextWithinReach,
  priceBreakdown,
  purchasePrice,
  shownSavings,
} from "./market.ts";

test("Cerato with one Moscow-region listing stays a seed and leaves the fork", () => {
  const cerato = catalog.find((item) => item.slug === "kia-cerato-1");
  assert.ok(cerato);
  assert.equal(cerato.sampleSize, 1);
  assert.equal(cerato.isSeed, true);
  assert.equal(cerato.median, 250_000);
  assert.equal(rareInMoscow(cerato), true);
  assert.equal(rareLine(cerato.sampleSize), "Редко в Москве: 1 объявление за месяц");
  assert.equal(regionTransferNote(cerato.slug), "В регионах 330–480 тыс. ₽ — перегон добавит расходы");
  assert.notEqual(bestSafeAt(catalog, 500_000)?.slug, "kia-cerato-1");
  assert.notEqual(nextWithinReach(catalog, 0)?.slug, "kia-cerato-1");
  assert.notEqual(nextDecentAt(catalog, 0)?.slug, "kia-cerato-1");
  assert.notEqual(almostAffordable(catalog, 320_000, 20_000)?.item.slug, "kia-cerato-1");
});

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
  const priced = { ...fusion, median: 300_000 };
  const items = [cheap, priced];
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
  const elantra = catalog.find((item) => item.slug === "hyundai-elantra-xd");
  assert.ok(elantra);
  assert.equal(elantra.median, 250_000);
  assert.equal(elantra.confidence, "low");
  assert.equal(elantra.isSeed, false);
  assert.equal(purchasePrice(elantra), 320_718);
  assert.ok(bands.pocket.every((item) => purchasePrice(item) <= 320_000));
  assert.ok(bands.pocket.some((item) => item.slug === "daewoo-matiz"));
  assert.ok(bands.pocket.every((item) => item.slug !== "nissan-almera-n16"));
  assert.ok(bands.pocket.every((item) => item.slug !== "hyundai-elantra-xd"));
  assert.ok(bands.soon.some((item) => item.slug === "hyundai-elantra-xd"));
  assert.ok(bands.pocket.every((item) => item.slug !== "kia-cerato-1"));
  assert.ok(bands.soon.every((item) => item.slug !== "kia-cerato-1"));
  assert.ok(bands.pocket.every((item) => item.slug !== "ford-fusion"));
  assert.ok(bands.soon.every((item) => item.slug !== "ford-fusion"));
  assert.ok(bands.later.some((item) => item.slug === "ford-fusion"));
});

test("at 320000 Matiz is today and Elantra is one deposit away", () => {
  const almera = catalog.find((item) => item.slug === "nissan-almera-n16");
  assert.ok(almera);
  assert.equal(almera.median, 395_000);
  assert.equal(almera.sampleSize, 8);
  assert.equal(almera.isSeed, false);
  assert.equal(purchasePrice(almera), 483_118);
  assert.equal(bestSafeAt(catalog, 320_000)?.slug, "daewoo-matiz");
  const almost = almostAffordable(catalog, 320_000, 20_000);
  assert.equal(almost?.item.slug, "hyundai-elantra-xd");
  assert.ok(almost);
  const today = bestSafeAt(catalog, 320_000);
  assert.ok(today && almost);
  assert.ok(almost.item.score - today.score >= ALMOST_WAIT_SCORE);
  assert.equal(almost.gap, 718);
  assert.equal(roundToThousands(almost.gap), 1_000);
  const text = almostNote(almost.item, almost.gap, 20_000, today.score);
  assert.match(text, /оценка 4,6 вместо 2,9/);
  assert.match(text, /Стоит подождать/);
});

test("at 800000 Almera is a full point above Octavia and worth the short wait", () => {
  const today = bestSafeAt(catalog, 800_000);
  const almost = almostAffordable(catalog, 800_000, 20_000);
  assert.equal(today?.slug, "skoda-octavia-a5");
  assert.equal(almost?.item.slug, "nissan-almera-g15");
  assert.ok(today && almost);
  assert.ok(almost.item.score - today.score >= ALMOST_WAIT_SCORE);
  const months = purchaseQuote({
    median: almost.item.median,
    hp: almost.item.hp,
    driver: { age: 20, experienceYears: 0 },
    licenseDate: null,
    onParentPolicy: false,
    saved: 800_000,
    monthly: 20_000,
    inflation: 0.007,
    asOf: "2026-10-16",
  }).months;
  assert.equal(months, 2);
  const text = almostNote(almost.item, almost.gap, 20_000, today.score, months);
  assert.match(text, /За .* это около 2 мес\., оценка 6,9 вместо 5,6\. Стоит подождать/);
});

test("at 320000 today is not Fusion because the real price is higher", () => {
  const fusion = catalog.find((item) => item.slug === "ford-fusion");
  assert.ok(fusion);
  const price = realPrice(fusion.median, fusion.hp);
  assert.equal(fusion.median, 474_000);
  assert.equal(price, 569_192);
  assert.ok(price > 320_000);
  assert.notEqual(bestSafeAt(catalog, 320_000)?.slug, "ford-fusion");
  assert.equal(bestSafeAt(catalog, 320_000)?.slug, "daewoo-matiz");
});

test("at 150000 Matiz is out of reach once startup costs are included", () => {
  const matiz = catalog.find((item) => item.slug === "daewoo-matiz");
  assert.ok(matiz);
  const price = purchasePrice(matiz);
  assert.ok(price > 150_000);
  assert.notEqual(bestSafeAt(catalog, 150_000)?.slug, "daewoo-matiz");
  assert.equal(bestSafeAt(catalog, 150_000), null);
});

test("nextJumpAfter 320000 reaches the real price of Elantra", () => {
  const elantra = catalog.find((item) => item.slug === "hyundai-elantra-xd");
  assert.ok(elantra);
  const jump = nextJumpAfter(catalog, 320_000);
  assert.equal(jump, purchasePrice(elantra));
  assert.equal(bestSafeAt(catalog, jump ?? 0)?.slug, "hyundai-elantra-xd");
});

test("Focus III is not the safe choice where it is affordable", () => {
  assert.notEqual(bestSafeAt(catalog, 700_000)?.slug, "ford-focus-3");
});

test("at 0 the fork names Matiz and a car scored at least 4.5", () => {
  const nearest = nextWithinReach(catalog, 0);
  const decent = nextDecentAt(catalog, 0);
  assert.equal(nearest?.slug, "daewoo-matiz");
  assert.equal(decent?.slug, "hyundai-elantra-xd");
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
  assert.equal(aimContrast(earlier, nearest.score, later, decent.score), "+1 мес. — и оценка 4,6 вместо 2,9");
  const gap = purchasePrice(decent) - purchasePrice(nearest);
  assert.equal(gap, 27_212);
  assert.ok(gap < 20_000 * 2);
  assert.equal(directSaveLine(decent.model, gap, later - earlier, 20_000), `Копи сразу на Elantra: всего ${approxRub(gap)} и около 1 мес. сверху`);
});

test("a purchase target rounds to thousands and the breakdown sums to the real price", () => {
  const matiz = catalog.find((item) => item.slug === "daewoo-matiz");
  assert.ok(matiz);
  const price = purchasePrice(matiz);
  assert.equal(matiz.median, 230_000);
  assert.equal(price, 293_506);
  assert.equal(roundToThousands(price), 294_000);
  const parts = priceBreakdown(matiz);
  assert.equal(parts.median + parts.osago + parts.registration + parts.diagnostic + parts.service + parts.reserve, parts.total);
  assert.equal(parts.total, price);
});

test("empty road posts stay unlabeled and the same neighbour is one span", () => {
  const posts = [150_000, 200_000, 400_000, 450_000].map((amount) => ({ amount, you: false }));
  const spans = collapseRoadPosts(posts, (amount) => (amount >= 400_000 ? "ford-fusion" : null));
  assert.equal(spans.length, 2);
  assert.equal(spans[0].slug, null);
  assert.equal(spans[0].from, 150_000);
  assert.equal(spans[0].to, 200_000);
  assert.equal(spans[1].slug, "ford-fusion");
  assert.equal(spans[1].from, 400_000);
  assert.equal(spans[1].to, 450_000);
  const withYou = collapseRoadPosts(
    [{ amount: 150_000, you: false }, { amount: 300_000, you: true }, { amount: 350_000, you: false }],
    () => "hyundai-elantra-xd",
  );
  assert.equal(withYou.length, 3);
  assert.equal(withYou[1].you, true);
});

test("the Solaris 9.9 fixture still separates bestAt from bestSafeAt", () => {
  const solaris = catalog.find((item) => item.slug === "hyundai-solaris-1");
  const fusion = catalog.find((item) => item.slug === "ford-fusion");
  assert.ok(solaris && fusion);
  const cheap = { ...solaris, median: 400_000, score: 9.9 };
  assert.notEqual(bestAt([cheap, fusion], 500_000)?.slug, bestSafeAt([cheap, fusion], 500_000)?.slug);
});
