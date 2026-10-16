import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { adviseFor, markBest, type AdviceModel } from "./advice.ts";
import { Model, type SubScores } from "./schema.ts";

const scores = (value: number): SubScores => ({
  reliability: value,
  safety: value,
  ownershipCost: value,
  purchaseRisk: value,
  liquidity: value,
});

function car(slug: string, score: number, median: number, verdict: "ok" | "avoid" = "ok"): AdviceModel {
  return {
    slug,
    gearboxes: [{ type: "AT", verdict: verdict === "avoid" ? "avoid" : "acceptable" }],
    mileage: { avoidFrom: 300000 },
    subScores: scores(score),
    price: { median, medianMileageKm: 100000 },
    budgetRules: verdict === "avoid" ? [{ from: 150000, to: 1000000, verdict: "avoid", reason: "не брать" }] : [],
  };
}

function priced(slug: string, median: number, mileage = 120000) {
  const model = Model.parse(JSON.parse(fs.readFileSync(`data/models/${slug}.json`, "utf8")));
  return { ...model, price: { median, medianMileageKm: mileage } };
}

test("Solaris is avoid at 500 000 and not avoid at 800 000", () => {
  const solaris = priced("hyundai-solaris-1", 820000, 160000);
  const low = adviseFor(solaris, 500000, [solaris]);
  const high = adviseFor(solaris, 800000, [solaris]);
  assert.equal(low?.verdict, "avoid");
  assert.notEqual(high?.verdict, "avoid");
});

test("Focus III is avoid anywhere in the catalog budget", () => {
  const focus = priced("ford-focus-3", 680000, 145000);
  assert.equal(adviseFor(focus, 200000, [focus])?.verdict, "avoid");
  assert.equal(adviseFor(focus, 1000000, [focus])?.verdict, "avoid");
});

test("only one car is marked best", () => {
  const items = [car("a", 5, 200000), car("b", 7, 220000), car("c", 4, 180000, "avoid")].map((model) => ({
    m: model,
    advice: adviseFor(model, 300000, [car("a", 5, 200000), car("b", 7, 220000), car("c", 4, 180000, "avoid")]),
  }));
  markBest(items, 300000);
  assert.equal(items.filter((item) => item.advice?.verdict === "best").length, 1);
  assert.equal(items.find((item) => item.advice?.verdict === "best")?.m.slug, "b");
});
