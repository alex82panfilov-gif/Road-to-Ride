import assert from "node:assert/strict";
import test from "node:test";
import { assessListing } from "./listing.ts";
import type { Model } from "./schema.ts";

const model = {
  years: [2006, 2013],
  mileage: { goodMax: 150_000, okMax: 220_000, avoidFrom: 300_000 },
} as Model;

test("flags a suspiciously low mileage", () => {
  const flags = assessListing(model, { p25: 300_000, median: 350_000, p75: 400_000 }, {
    year: 2009,
    mileageKm: 40_000,
    priceRub: 350_000,
    owners: 2,
  }, 2026);
  assert.ok(flags.some((flag) => flag.text.includes("подозрительно мал")));
});
