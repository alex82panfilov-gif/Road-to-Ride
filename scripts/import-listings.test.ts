import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { Model, SnapshotFile } from "../lib/schema.ts";
import { applyRows, gearboxTypeOf, listingIssues, quantile, rowsFromCsv } from "./import-listings.ts";
import { reviewRaw } from "./validate-data.ts";

const cerato = Model.parse(JSON.parse(fs.readFileSync(path.join("data", "models", "kia-cerato-1.json"), "utf8")));
const elantra = Model.parse(JSON.parse(fs.readFileSync(path.join("data", "models", "hyundai-elantra-xd.json"), "utf8")));
const matiz = Model.parse(JSON.parse(fs.readFileSync(path.join("data", "models", "daewoo-matiz.json"), "utf8")));
const almera = Model.parse(JSON.parse(fs.readFileSync(path.join("data", "models", "nissan-almera-g15.json"), "utf8")));
const octavia = Model.parse(JSON.parse(fs.readFileSync(path.join("data", "models", "skoda-octavia-a5.json"), "utf8")));
const polo = Model.parse(JSON.parse(fs.readFileSync(path.join("data", "models", "volkswagen-polo-sedan.json"), "utf8")));

function applyOne(model: ReturnType<typeof Model.parse>, row: string) {
  const parsed = rowsFromCsv(`${header}\n${row}`);
  assert.deepEqual(parsed.errors, []);
  return applyRows(snapshot, parsed.rows, new Map([[model.slug, model]]));
}
const snapshot = SnapshotFile.parse(JSON.parse(fs.readFileSync(path.join("data", "snapshots", "2026-10.json"), "utf8")));

const header = "slug,platform,listingId,year,mileageKm,priceRub,engine,gearbox,city";

test("an empty manual table is only a header", () => {
  const parsed = rowsFromCsv(fs.readFileSync(path.join("data", "raw", "TEMPLATE.csv"), "utf8"));
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.rows.length, 0);
});

test("a phone number is refused before any listing is built", () => {
  const parsed = rowsFromCsv(`${header}\nkia-cerato-1,drom,abc,2007,120000,250000,1.6,+7 916 000-00-00,Москва`);
  assert.equal(parsed.rows.length, 0);
  assert.ok(parsed.errors.some((error) => error.includes("телефон")));
});

test("DSG is a robot even if the cell also says automatic", () => {
  assert.equal(gearboxTypeOf("автомат DSG DQ200"), "DCT");
  assert.equal(gearboxTypeOf("6АКПП Aisin 09G"), "AT");
});

test("one Cerato row updates that model and leaves the month a seed", () => {
  const parsed = rowsFromCsv(`${header}\nkia-cerato-1,drom,abc1,2007,120000,248000,1.6 MPI,4АКПП,Москва`);
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

test("an Elantra 2.0 does not enter the 1.6 automatic sample", () => {
  const parsed = rowsFromCsv(`${header}\nhyundai-elantra-xd,autoru,el2,2005,117894,289000,2.0,4АКПП,Москва`);
  const applied = applyRows(snapshot, parsed.rows, new Map([[elantra.slug, elantra]]));
  assert.ok(applied.errors.some((error) => error.includes("не бывает коробки AT")));
  const before = snapshot.snapshots.find((item) => item.slug === "hyundai-elantra-xd");
  const after = applied.file.snapshots.find((item) => item.slug === "hyundai-elantra-xd");
  assert.equal(after, before);
  assert.ok(!after?.listings?.some((listing) => listing.id === "el2"));
});

test("an Elantra 1.6 automatic is accepted", () => {
  const parsed = rowsFromCsv(`${header}\nhyundai-elantra-xd,autoru,el1,2005,117894,289000,1.6,4АКПП,Москва`);
  const applied = applyRows(snapshot, parsed.rows, new Map([[elantra.slug, elantra]]));
  assert.deepEqual(applied.errors, []);
  assert.equal(applied.file.snapshots.find((item) => item.slug === "hyundai-elantra-xd")?.listings?.length, 1);
});

test("a gearbox the card does not allow is not written", () => {
  const parsed = rowsFromCsv(`${header}\nkia-cerato-1,autoru,abc2,2007,90000,260000,1.6,DSG,Москва`);
  const applied = applyRows(snapshot, parsed.rows, new Map([[cerato.slug, cerato]]));
  assert.ok(applied.errors.some((error) => error.includes("не бывает коробки DCT")));
  assert.equal(applied.file.snapshots.find((item) => item.slug === "kia-cerato-1")?.listings, undefined);
});

test("a year outside the generation is refused by the same checks as validate", () => {
  const parsed = rowsFromCsv(`${header}\nkia-cerato-1,drom,abc1,2000,120000,248000,1.6,4АКПП,Москва`);
  const applied = applyRows(snapshot, parsed.rows, new Map([[cerato.slug, cerato]]));
  const issues = listingIssues(applied.file, ["kia-cerato-1"], new Map([[cerato.slug, cerato]]));
  assert.ok(issues.some((issue) => issue.includes("вне поколения")));
});

test("Matiz and Almera G15 accept only their automatic pair", () => {
  const matizOk = applyOne(matiz, "daewoo-matiz,drom,m1,2008,90000,160000,0.8,4АКПП,Москва");
  assert.deepEqual(matizOk.errors, []);
  const almeraOk = applyOne(almera, "nissan-almera-g15,autoru,a1,2015,120000,700000,1.6 K4M,4АКПП DP2,Москва");
  assert.deepEqual(almeraOk.errors, []);
});

test("Octavia keeps 1.6 MPI with 09G and drops 1.8, 1.4 and DSG", () => {
  const ok = applyOne(octavia, "skoda-octavia-a5,drom,o1,2008,140000,500000,1.6 MPI,6АКПП Aisin 09G,Москва");
  assert.deepEqual(ok.errors, []);
  const tsi = applyOne(octavia, "skoda-octavia-a5,drom,o2,2008,140000,500000,1.8 TSI,автомат 09G,Москва");
  assert.ok(tsi.errors.some((error) => error.includes("не бывает коробки AT")));
  const small = applyOne(octavia, "skoda-octavia-a5,drom,o4,2010,120000,480000,1.4 TSI,DSG,Москва");
  assert.ok(small.errors.some((error) => error.includes("нет мотора")));
  const dsg = applyOne(octavia, "skoda-octavia-a5,drom,o3,2008,140000,500000,1.6 MPI,DSG DQ200,Москва");
  assert.ok(dsg.errors.some((error) => error.includes("избегать")));
});

test("Polo sample is the late CWVA automatic, not an early car and not DSG", () => {
  const ok = applyOne(polo, "volkswagen-polo-sedan,autoru,p1,2017,80000,850000,1.6 CWVA,6АКПП Aisin 09G,Москва");
  assert.deepEqual(ok.errors, []);
  const early = applyOne(polo, "volkswagen-polo-sedan,autoru,p2,2012,140000,450000,1.6 CFNA,6АКПП Aisin,Москва");
  assert.ok(early.errors.some((error) => error.includes("не бывает коробки AT")));
  const dsg = applyOne(polo, "volkswagen-polo-sedan,drom,p3,2017,80000,850000,1.6 CWVA,DSG DQ200,Москва");
  assert.ok(dsg.errors.some((error) => error.includes("избегать")));
});

test("quantile matches the validator interpolation", () => {
  assert.equal(quantile([100, 200, 300, 400], 0.5), 250);
  assert.equal(quantile([248000], 0.25), 248000);
});

test("a 2004 car with 290 km is dropped as an input error", () => {
  const parsed = rowsFromCsv(`${header}\nhyundai-elantra-xd,drom,typo,2004,290,250000,1.6,4АКПП,Москва`);
  assert.deepEqual(parsed.errors, []);
  const applied = applyRows(snapshot, parsed.rows, new Map([[elantra.slug, elantra]]));
  assert.deepEqual(applied.errors, []);
  const models = new Map([[elantra.slug, elantra]]);
  const issues = listingIssues(applied.file, ["hyundai-elantra-xd"], models);
  assert.ok(issues.some((issue) => issue.includes("290") && issue.includes("ошибка ввода")));
  const warnings = reviewRaw(JSON.stringify({ ...applied.file, seed: false }), models, null).issues.filter(
    (issue) => issue.level === "warn" && issue.slug === "hyundai-elantra-xd",
  );
  assert.ok(warnings.some((issue) => issue.msg.includes("290") && issue.msg.includes("отброшено")));
});

test("a listing from Bryansk is rejected", () => {
  const parsed = rowsFromCsv(`${header}\nhyundai-elantra-xd,drom,br,2004,180000,225000,1.6,4АКПП,Брянск`);
  assert.equal(parsed.rows.length, 0);
  assert.ok(parsed.errors.some((error) => error.includes("Брянск") && error.includes("Московской области")));
});

test("Mytishchi, Balashikha and Pushkino stay in the sample", () => {
  const parsed = rowsFromCsv(
    `${header}\nhyundai-elantra-xd,drom,my,2009,267000,300000,1.6,4АКПП,Мытищи\nhyundai-elantra-xd,drom,ba,2004,180000,225000,1.6,4АКПП,Балашиха\nhyundai-elantra-xd,drom,pu,2005,220000,220000,1.6,4АКПП,Пушкино`,
  );
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.rows.length, 3);
});
