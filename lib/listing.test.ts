import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { admittedFault, assessListing } from "./listing.ts";
import { Model } from "./schema.ts";

const elantra = Model.parse(JSON.parse(fs.readFileSync("data/models/hyundai-elantra-xd.json", "utf8")));
const price = { p25: 200_000, median: 200_000, p75: 260_000, isSeed: true };

function mileageText(year: number, mileageKm: number, owners = 1) {
  return assessListing(elantra, price, { year, mileageKm, priceRub: 200_000, owners }, 2026)
    .map((flag) => flag.text)
    .join(" ");
}

test("a 2005 Elantra with 118 thousand km and four owners is too low for its age", () => {
  const text = mileageText(2005, 117_894, 4);
  assert.match(text, /Подозрительно мало для 21 года/);
  assert.match(text, /Каждая смена владельца — повод для скрутки/);
  assert.match(text, /машине 21 год/);
  assert.doesNotMatch(text, /Обычный для возраста/);
});

test("a 2015 car with 450 thousand km looks like a taxi", () => {
  const text = mileageText(2015, 450_000);
  assert.match(text, /такси/);
  assert.doesNotMatch(text, /Обычный для возраста/);
});

test("289000 on a seed Elantra is well above the orientir", () => {
  const text = assessListing(elantra, price, { year: 2005, mileageKm: 117_894, priceRub: 289_000, owners: 4 }, 2026)
    .map((flag) => flag.text)
    .join(" ");
  assert.match(text, /подозрительно мало/i);
  assert.match(text, /Заметно выше стартового ориентира, на 44,5%/);
  assert.match(text, /Ориентир стартовый, не замер рынка/);
});

test("a measured price uses the p25-p75 band", () => {
  const market = { p25: 200_000, median: 240_000, p75: 260_000, isSeed: false };
  const near = assessListing(elantra, market, { year: 2008, mileageKm: 180_000, priceRub: 230_000, owners: 2 }, 2026);
  assert.ok(near.some((flag) => flag.text === "Рядом с рынком."));
  assert.ok(near.every((flag) => !flag.text.includes("Ориентир стартовый")));
  const high = assessListing(elantra, market, { year: 2008, mileageKm: 180_000, priceRub: 312_000, owners: 2 }, 2026);
  assert.ok(high.some((flag) => flag.text.startsWith("Выше рынка")));
  const far = assessListing(elantra, market, { year: 2008, mileageKm: 180_000, priceRub: 400_000, owners: 2 }, 2026);
  assert.ok(far.some((flag) => flag.text.startsWith("Заметно выше рынка")));
  const bait = assessListing(elantra, market, { year: 2008, mileageKm: 180_000, priceRub: 140_000, owners: 2 }, 2026);
  assert.ok(bait.some((flag) => flag.text.includes("Подозрительно дёшево")));
});

test("a no-repair claim that names a fault is the seller's own words", () => {
  assert.equal(admittedFault("на холодную стук, в остальном идеал", "Не требует ремонта"), "Продавец сам указал неисправность.");
  assert.equal(admittedFault("на холодную стук", "Есть неисправности"), null);
  assert.equal(admittedFault("один владелец, обслуживание у дилера", "Не требует ремонта"), null);
});

test("a 2018 car with 90 thousand km is ordinary for its age", () => {
  const text = mileageText(2018, 90_000);
  assert.match(text, /Обычный для возраста/);
  assert.doesNotMatch(text, /подозрительно мало/i);
  assert.doesNotMatch(text, /такси/);
});
