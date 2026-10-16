import assert from "node:assert/strict";
import test from "node:test";
import { parseImport } from "./storage.ts";

const deposit = { id: "a", amount: 1000, date: "2026-01-01", by: "me" };

test("an old piggy without licenseDate stays under a year", () => {
  const user = parseImport(JSON.stringify({ app: "road-to-ride", version: 1, deposits: [deposit], driver: { age: 20, experienceYears: 0 } }));
  assert.equal(user.licenseDate, null);
  assert.equal(user.onParentPolicy, false);
  assert.equal(user.deposits[0].amount, 1000);
  assert.equal(user.driver.age, 20);
});

test("a saved license date survives import", () => {
  const user = parseImport(JSON.stringify({ app: "road-to-ride", version: 1, deposits: [deposit], licenseDate: "2025-06-01" }));
  assert.equal(user.licenseDate, "2025-06-01");
  assert.equal(user.onParentPolicy, false);
});

test("a parent-policy mark survives import", () => {
  const user = parseImport(JSON.stringify({ app: "road-to-ride", version: 1, deposits: [deposit], onParentPolicy: true }));
  assert.equal(user.onParentPolicy, true);
});
