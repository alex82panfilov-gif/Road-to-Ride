import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { Model, SnapshotFile } from "../lib/schema.ts";
import { applyRows, gearboxTypeOf, listingIssues, quantile, rowsFromCsv } from "./import-listings.ts";

const cerato = Model.parse(JSON.parse(fs.readFileSync(path.join("data", "models", "kia-cerato-1.json"), "utf8")));
const snapshot = SnapshotFile.parse(JSON.parse(fs.readFileSync(path.join("data", "snapshots", "2026-10.json"), "utf8")));

const header = "slug,platform,listingId,year,mileageKm,priceRub,engine,gearbox";

test("an empty manual table is only a header", () => {
  const parsed = rowsFromCsv(fs.readFileSync(path.join("data", "raw", "TEMPLATE.csv"), "utf8"));
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.rows.length, 0);
});

test("a phone number is refused before any listing is built", () => {
  const parsed = rowsFromCsv(`${header}\nkia-cerato-1,drom,abc,2007,120000,250000,1.6,+7 916 000-00-00`);
  assert.equal(parsed.rows.length, 0);
  assert.ok(parsed.errors.some((error) => error.includes("телефон")));
});

test("DSG is a robot even if the cell also says automatic", () => {
  assert.equal(gearboxTypeOf("автомат DSG DQ200"), "DCT");
  assert.equal(gearboxTypeOf("6АКПП Aisin 09G"), "AT");
});

test("one Cerato row updates that model and leaves the month a seed", () => {
  const parsed = rowsFromCsv(`${header}\nkia-cerato-1,drom,abc1,2007,120000,248000,1.6 MPI,4АКПП`);
  assert.deepEqual(parsed.errors, []);
  const applied = applyRows(snapshot, parsed.rows, new Map([[cerato.slug, cerato]]));
  assert.deepEqual(applied.errors, []);
  const row = applied.file.snapshots.find((item) => item.slug === "kia-cerato-1");
  assert.equal(row?.listings?.length, 1);
  assert.equal(row?.median, 248_000);
  assert.equal(row?.sampleSize, 1);
  assert.equal(applied.file.seed, true);
  assert.equal(applied.file.schemaVersion, 2);
  const untouched = applied.file.snapshots.find((item) => item.slug === "ford-fusion");
  assert.equal(untouched?.listings, undefined);
});

test("a gearbox the card does not allow is not written", () => {
  const parsed = rowsFromCsv(`${header}\nkia-cerato-1,autoru,abc2,2007,90000,260000,1.6,DSG`);
  const applied = applyRows(snapshot, parsed.rows, new Map([[cerato.slug, cerato]]));
  assert.ok(applied.errors.some((error) => error.includes("не бывает коробки DCT")));
  assert.equal(applied.file.snapshots.find((item) => item.slug === "kia-cerato-1")?.listings, undefined);
});

test("a year outside the generation is refused by the same checks as validate", () => {
  const parsed = rowsFromCsv(`${header}\nkia-cerato-1,drom,abc1,2000,120000,248000,1.6,4АКПП`);
  const applied = applyRows(snapshot, parsed.rows, new Map([[cerato.slug, cerato]]));
  const issues = listingIssues(applied.file, ["kia-cerato-1"], new Map([[cerato.slug, cerato]]));
  assert.ok(issues.some((issue) => issue.includes("вне поколения")));
});

test("quantile matches the validator interpolation", () => {
  assert.equal(quantile([100, 200, 300, 400], 0.5), 250);
  assert.equal(quantile([248000], 0.25), 248000);
});
