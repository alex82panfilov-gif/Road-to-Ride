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

test("an old piggy without withdrawal fields still imports", () => {
  const user = parseImport(JSON.stringify({ app: "road-to-ride", version: 1, deposits: [deposit, { ...deposit, id: "b", reason: null }] }));
  assert.equal(user.deposits.length, 2);
  assert.equal(user.deposits[0].amount, 1000);
  assert.equal(user.deposits[1].reason, undefined);
});

test("a saved visit date survives import", () => {
  const user = parseImport(JSON.stringify({ app: "road-to-ride", version: 1, deposits: [deposit], lastSeenAt: "2026-09-01" }));
  assert.equal(user.lastSeenAt, "2026-09-01");
});

test("a withdrawal with a negative amount survives import", () => {
  const user = parseImport(
    JSON.stringify({
      app: "road-to-ride",
      version: 1,
      deposits: [deposit, { id: "out", amount: -50_000, date: "2026-02-01", by: "me", reason: "repair" }],
    }),
  );
  assert.equal(user.deposits[1].amount, -50_000);
  assert.equal(user.deposits[1].reason, "repair");
  assert.equal(user.deposits.reduce((sum, item) => sum + item.amount, 0), 1000 - 50_000);
});
