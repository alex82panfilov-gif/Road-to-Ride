import assert from "node:assert/strict";
import test from "node:test";
import { catalog } from "../data.ts";
import { purchasePrice } from "./market.ts";
import { adviceForCar, alternativesFor, avoidExcuse, cheaperTrap, isAvoidCar } from "./advice.ts";

function car(slug: string) {
  const item = catalog.find((entry) => entry.slug === slug);
  if (!item) throw new Error(slug);
  return item;
}

test("Solaris and Polo are not avoid at their own median, Focus III stays avoid", () => {
  for (const saved of [300_000, 800_000]) {
    assert.ok(saved > 0);
    const solaris = car("hyundai-solaris-1");
    const polo = car("volkswagen-polo-sedan");
    const focus = car("ford-focus-3");
    assert.equal(solaris.median, 820_000);
    assert.equal(polo.median, 850_000);
    assert.notEqual(adviceForCar(solaris, catalog)?.verdict, "avoid");
    assert.notEqual(adviceForCar(polo, catalog)?.verdict, "avoid");
    assert.equal(adviceForCar(focus, catalog)?.verdict, "avoid");
    assert.match(cheaperTrap(solaris) ?? "", /650\s?000/);
    assert.match(cheaperTrap(solaris) ?? "", /такси/i);
    assert.match(cheaperTrap(polo) ?? "", /такси/i);
    assert.equal(cheaperTrap(focus), null);
    assert.match(avoidExcuse(focus) ?? "", /коробк/);
  }
});

test("alternatives stay inside the price rule and prefer insteadSlugs that fit", () => {
  const focus = car("ford-focus-3");
  const price = purchasePrice(focus);
  const near = catalog.find(
    (item) =>
      item.slug !== focus.slug &&
      !isAvoidCar(item, catalog) &&
      Math.abs(purchasePrice(item) - price) / price <= 0.1,
  );
  assert.ok(near);
  const hosted = {
    ...focus,
    budgetRules: [{ from: 150_000, to: 1_000_000, verdict: "avoid" as const, reason: "робот", insteadSlugs: [near.slug] }],
  };
  assert.equal(alternativesFor(hosted, catalog, price)[0]?.slug, near.slug);

  const atPiggy = alternativesFor(focus, catalog, 300_000);
  assert.ok(atPiggy.length >= 1 && atPiggy.length <= 2);
  assert.ok(atPiggy.every((item) => purchasePrice(item) <= 300_000 && !isAvoidCar(item, catalog)));

  const missed = {
    ...focus,
    budgetRules: [{ from: 150_000, to: 1_000_000, verdict: "avoid" as const, reason: "робот", insteadSlugs: ["no-such-car"] }],
  };
  const fallback = alternativesFor(missed, catalog, 800_000);
  assert.ok(fallback.length <= 2);
  assert.ok(fallback.every((item) => !isAvoidCar(item, catalog)));
});
