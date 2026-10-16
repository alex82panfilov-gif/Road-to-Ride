import assert from "node:assert/strict";
import test from "node:test";
import { modelScore, tierScore } from "./score.ts";

const classic = { reliability: 5, safety: 4, ownershipCost: 5, purchaseRisk: 4, liquidity: 4 };

test("modelScore matches the published weights", () => {
  assert.equal(modelScore(classic), 4.5);
});

test("tierScore ignores cars above the budget", () => {
  const models = [
    { median: 350_000, subScores: classic },
    { median: 900_000, subScores: { reliability: 9, safety: 9, ownershipCost: 9, purchaseRisk: 9, liquidity: 9 } },
  ];
  assert.equal(tierScore(400_000, models), 4.5);
  assert.equal(tierScore(100_000, models), 0);
});
