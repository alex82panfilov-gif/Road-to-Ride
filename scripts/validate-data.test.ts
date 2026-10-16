import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { Model } from "../lib/schema.ts";
import { modelCardIssues, reviewRaw } from "./validate-data.ts";

const focus = Model.parse(JSON.parse(fs.readFileSync(path.join("data", "models", "ford-focus-3.json"), "utf8")));
const models = new Map([[focus.slug, focus]]);

function errorsOf(file: string) {
  const raw = fs.readFileSync(path.join("tests", "fixtures", file), "utf8");
  return reviewRaw(raw, models, null).issues.filter((issue) => issue.level === "error");
}

test("a real automatic Focus listing passes", () => {
  assert.equal(errorsOf("valid-snapshot.json").length, 0);
});

test("a 2012 Focus listed as an automatic is rejected", () => {
  const errors = errorsOf("powershift-snapshot.json");
  assert.ok(errors.some((issue) => issue.msg.includes("не бывает коробки AT")));
});

test("a snapshot with a phone number is rejected", () => {
  const errors = errorsOf("phone-snapshot.json");
  assert.ok(errors.some((issue) => issue.msg.includes("телефон")));
});

test("a model without listing rules warns that search falls back to generation years", () => {
  const solaris = Model.parse(JSON.parse(fs.readFileSync(path.join("data", "models", "hyundai-solaris-1.json"), "utf8")));
  const warnings = modelCardIssues(solaris);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].level, "warn");
  assert.match(warnings[0].msg, /listingRules/);
  assert.match(warnings[0].msg, /годы поколения/);
  assert.equal(modelCardIssues(focus).length, 0);
});
