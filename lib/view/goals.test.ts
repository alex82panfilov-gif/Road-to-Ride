import assert from "node:assert/strict";
import test from "node:test";
import { catalog } from "../data.ts";
import { purchasePrice } from "./market.ts";
import { goalGroups, goalLabel } from "./goals.ts";

test("goal list names the generation and keeps avoid at the end", () => {
  const groups = goalGroups(catalog, 300_000, 20_000, 0.007);
  assert.equal(groups.at(-1)?.id, "avoid");
  assert.ok(groups.at(-1)?.items.some((item) => item.slug === "ford-focus-3"));
  const almeras = groups.flatMap((group) => group.items).filter((item) => item.model === "Almera");
  const labels = almeras.map((item) => goalLabel(item));
  assert.ok(almeras.length >= 2);
  assert.equal(new Set(labels).size, labels.length);
  assert.ok(labels.every((label) => /Almera .+/.test(label) && /· ≈ /.test(label) && /· \d,\d$/.test(label)));
  for (const group of groups) {
    const prices = group.items.map((item) => purchasePrice(item));
    assert.deepEqual(prices, [...prices].sort((left, right) => left - right));
  }
  const focuses = labels.concat(groups.flatMap((group) => group.items).filter((item) => item.model === "Focus").map((item) => goalLabel(item)));
  assert.equal(groups.some((group) => group.items.some((item) => item.slug === "kia-cerato-1")), false);
  assert.ok(focuses.some((label) => label.includes("II")));
  assert.ok(focuses.some((label) => label.includes("III")));
});
