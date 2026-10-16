import assert from "node:assert/strict";
import test from "node:test";
import { meta } from "./meta.ts";

test("the OSAGO base tariff is the 7204-U corridor", () => {
  assert.equal(meta.osago.tbMin, 1_399);
  assert.equal(meta.osago.tbMax, 8_665);
  assert.match(meta.osago.sourceTitle, /7204-У/);
  assert.match(meta.osago.sourceUrl, /^https?:\/\//);
});
