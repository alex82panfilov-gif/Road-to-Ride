import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { Model } from "../lib/schema.ts";
import { reviewRaw } from "./validate-data.ts";

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
