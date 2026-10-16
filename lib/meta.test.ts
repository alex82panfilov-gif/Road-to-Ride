import assert from "node:assert/strict";
import test from "node:test";
import { ageExperienceCoef, experiencePurchaseLine, experienceYearsOn, meta, osagoRange, purchaseQuote } from "./meta.ts";

test("the OSAGO base tariff is the 7204-U corridor", () => {
  assert.equal(meta.osago.tbMin, 1_399);
  assert.equal(meta.osago.tbMax, 8_665);
  assert.match(meta.osago.sourceTitle, /7204-У/);
  assert.match(meta.osago.sourceUrl, /^https?:\/\//);
});

test("ages 18-21 use 2.27 under a year and 1.92 for the next year", () => {
  assert.equal(ageExperienceCoef(20, 0), 2.27);
  assert.equal(ageExperienceCoef(21, 0.9), 2.27);
  assert.equal(ageExperienceCoef(18, 1), 1.92);
  assert.equal(ageExperienceCoef(21, 1.9), 1.92);
  assert.equal(ageExperienceCoef(21, 2), 1.97);
});

test("a fresh license plus twelve months is one year of experience", () => {
  assert.equal(experienceYearsOn(null, "2026-10-16", 12), 1);
  assert.equal(experienceYearsOn("2025-10-16", "2026-10-16", 0), 1);
  assert.equal(experienceYearsOn("2025-10-17", "2026-10-16", 0), 11 / 12);
});

test("saving past a year prices OSAGO at 1.92 and says so", () => {
  const driver = { age: 20, experienceYears: 0 };
  const quote = purchaseQuote({
    median: 150_000,
    hp: 51,
    driver,
    licenseDate: null,
    saved: 0,
    monthly: 20_000,
    inflation: 0.007,
    asOf: "2026-10-16",
  });
  assert.ok(quote.months !== null && quote.months >= 12);
  assert.equal(ageExperienceCoef(quote.age, quote.experienceYears), 1.92);
  assert.ok(quote.osago < osagoRange(51, driver).mid);
  assert.equal(experiencePurchaseLine(quote.experienceYears), "ОСАГО посчитано на дату покупки: стаж к тому времени 1 год.");
});

test("buying now keeps the new-driver coefficient", () => {
  const quote = purchaseQuote({
    median: 150_000,
    hp: 51,
    driver: { age: 20, experienceYears: 0 },
    licenseDate: null,
    saved: 500_000,
    monthly: 0,
    inflation: 0.007,
    asOf: "2026-10-16",
  });
  assert.equal(quote.months, 0);
  assert.equal(quote.experienceYears, 0);
  assert.equal(ageExperienceCoef(quote.age, quote.experienceYears), 2.27);
});
