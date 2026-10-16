import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { assessListing } from "./listing.ts";
import { Model } from "./schema.ts";

const elantra = Model.parse(JSON.parse(fs.readFileSync("data/models/hyundai-elantra-xd.json", "utf8")));
const price = { p25: 180_000, median: 200_000, p75: 230_000 };

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

test("a 2018 car with 90 thousand km is ordinary for its age", () => {
  const text = mileageText(2018, 90_000);
  assert.match(text, /Обычный для возраста/);
  assert.doesNotMatch(text, /подозрительно мало/i);
  assert.doesNotMatch(text, /такси/);
});
