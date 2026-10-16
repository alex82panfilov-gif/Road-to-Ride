import assert from "node:assert/strict";
import test from "node:test";
import { catalog } from "../data.ts";
import { adviceForCar, cheaperTrap } from "./advice.ts";

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
  }
});
