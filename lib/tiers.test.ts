import assert from "node:assert/strict";
import test from "node:test";
import { levelForAmount, progressToNextTier, tierAmounts } from "./tiers.ts";

test("builds 18 levels from 150 to 1 000 thousand", () => {
  const amounts = tierAmounts();
  assert.equal(amounts.length, 18);
  assert.equal(amounts[0], 150_000);
  assert.equal(amounts.at(-1), 1_000_000);
});

test("treats anything under 150 000 as level 0", () => {
  assert.equal(levelForAmount(100_000), 0);
  assert.equal(levelForAmount(150_000), 1);
  assert.equal(levelForAmount(350_000), 5);
  assert.equal(levelForAmount(1_000_000), 18);
});

test("fills the outer ring toward the next 50 000", () => {
  assert.equal(progressToNextTier(175_000), 0.5);
  assert.equal(progressToNextTier(1_000_000), 1);
});
