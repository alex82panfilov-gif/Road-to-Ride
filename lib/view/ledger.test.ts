import assert from "node:assert/strict";
import test from "node:test";
import { catalog } from "../data.ts";
import { bestSafeAt } from "./market.ts";
import { setbackLine, withdrawalError } from "./ledger.ts";

test("300000 minus 50000 changes today and does not invent a penalty", () => {
  const before = bestSafeAt(catalog, 300_000);
  const after = bestSafeAt(catalog, 250_000);
  assert.ok(before);
  assert.notEqual(after?.slug, before.slug);
  const line = setbackLine(before, 250_000);
  assert.match(line ?? "", /^Бывает\. До .+ снова ≈ /);
  assert.doesNotMatch(line ?? "", /штраф|уровень/i);
});

test("a withdrawal larger than the balance is rejected", () => {
  assert.equal(withdrawalError(300_000, 50_000), null);
  assert.equal(withdrawalError(300_000, 300_000), null);
  assert.equal(withdrawalError(300_000, 300_001), "Нельзя снять больше, чем есть в копилке.");
  assert.equal(withdrawalError(0, 1), "Нельзя снять больше, чем есть в копилке.");
});
