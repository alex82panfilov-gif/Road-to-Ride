import assert from "node:assert/strict";
import test from "node:test";
import { monthsToGoal } from "./forecast.ts";

test("reaches a goal when savings already cover it", () => {
  assert.equal(monthsToGoal(400_000, 10_000, 350_000, 0.007), 0);
});

test("counts months with price growth", () => {
  const months = monthsToGoal(0, 25_000, 300_000, 0);
  assert.equal(months, 12);
});

test("returns null when the goal outruns deposits", () => {
  assert.equal(monthsToGoal(0, 1_000, 5_000_000, 0.05), null);
});
