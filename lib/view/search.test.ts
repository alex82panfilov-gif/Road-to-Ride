import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { rub } from "../format.ts";
import { Model } from "../schema.ts";
import { searchLinks, similarWindow } from "./search.ts";

function load(slug: string) {
  return Model.parse(JSON.parse(fs.readFileSync(`data/models/${slug}.json`, "utf8")));
}

const grouped = new Intl.NumberFormat("ru-RU");

test("Polo at 250 000 searches from about 800 000, not from the piggy bank", () => {
  const result = searchLinks(load("volkswagen-polo-sedan"), { median: 850_000, savings: 250_000 });
  assert.equal(result.priceFrom, 800_000);
  assert.equal(result.priceTo, 1_060_000);
  assert.deepEqual(result.years, [2015, 2020]);
  assert.deepEqual(result.volumes, [1.6]);
  assert.deepEqual(result.engines.map((engine) => engine.code), ["CWVA"]);
  assert.equal(result.yearSource, "rules");
  assert.equal(result.kmTo, 230_000);
  assert.equal(
    result.caption,
    `Поиск: 2015–2020, 1.6, автомат, ${grouped.format(800_000)} – ${grouped.format(1_060_000)} ₽, до ${grouped.format(230_000)} км`,
  );
  assert.equal(result.savings.kind, "note");
  if (result.savings.kind === "note") {
    assert.equal(
      result.savings.text,
      `За ${rub(250_000)} нормальных Polo с автоматом почти нет — дешевле ${rub(800_000)} в основном такси`,
    );
  }
  assert.match(result.links.drom, /\/sedan\/\?/);
  assert.match(result.links.drom, /minyear=2015&maxyear=2020/);
  assert.match(result.links.drom, /mv=1\.6&xv=1\.6/);
  assert.match(result.links.drom, /minprice=800000&maxprice=1060000/);
  assert.match(result.links.drom, /maxprobeg=230000/);
  assert.match(result.links.drom, /transmission\[\]=2&transmission\[\]=5/);
  assert.doesNotMatch(result.links.drom, /(?:^|[?&])transmission=2(?:&|$)/);
  assert.doesNotMatch(result.links.drom, /do-250000/);
  assert.match(result.links.autoru, /\/volkswagen\/polo\/20113124\/used\/body-sedan\/\?/);
  assert.match(result.links.autoru, /year_from=2015&year_to=2020/);
  assert.match(result.links.autoru, /price_from=800000&price_to=1060000/);
  assert.match(result.links.autoru, /displacement_from=1600&displacement_to=1600/);
  assert.match(result.links.autoru, /km_age_to=230000/);
  assert.doesNotMatch(result.links.autoru, /transmission=/);
});

test("Solaris at 800 000 keeps a piggy-bank link because that budget clears the taxi floor", () => {
  const result = searchLinks(load("hyundai-solaris-1"), { median: 820_000, savings: 800_000 });
  assert.equal(result.priceFrom, 650_000);
  assert.equal(result.yearSource, "generation");
  assert.deepEqual(result.years, [2010, 2017]);
  assert.equal(result.savings.kind, "links");
  if (result.savings.kind === "links") {
    assert.equal(result.savings.label, `В пределах копилки (до ${rub(800_000)})`);
    assert.match(result.savings.links.drom, /minprice=650000&maxprice=800000/);
    assert.match(result.savings.links.autoru, /price_from=650000&price_to=800000/);
  }
});

test("Focus III search is only the 1.5 EcoBoost automatic from 2015 to 2019", () => {
  const result = searchLinks(load("ford-focus-3"), { median: 680_000, savings: 250_000 });
  assert.deepEqual(result.engines.map((engine) => engine.code), ["1.5 EcoBoost"]);
  assert.deepEqual(result.volumes, [1.5]);
  assert.deepEqual(result.years, [2015, 2019]);
  assert.equal(result.savings.kind, "note");
  assert.match(result.links.drom, /mv=1\.5&xv=1\.5/);
  assert.match(result.links.drom, /minyear=2015&maxyear=2019/);
  assert.match(result.links.drom, /\/hatchback\//);
  assert.doesNotMatch(result.links.drom, /mv=1\.6/);
  assert.doesNotMatch(result.links.autoru, /displacement_from=1600/);
  assert.match(result.links.autoru, /\/used\/body-hatchback\/\?/);
  assert.match(result.links.autoru, /displacement_from=1500&displacement_to=1500/);
});

test("a model without listing rules uses the generation years", () => {
  const result = searchLinks(load("hyundai-solaris-1"), { median: 820_000 });
  assert.equal(result.yearSource, "generation");
  assert.deepEqual(result.years, [2010, 2017]);
  assert.equal(result.savings.kind, "none");
});

test("a similar-ad window is two years and thirty percent of mileage", () => {
  assert.deepEqual(similarWindow(2005, 117_894), { yearFrom: 2003, yearTo: 2007, kmFrom: 82_526, kmTo: 153_262 });
  const result = searchLinks(load("hyundai-elantra-xd"), {
    median: 200_000,
    similar: { year: 2005, mileageKm: 117_894 },
  });
  assert.match(result.links.autoru, /year_from=2003&year_to=2007/);
  assert.match(result.links.autoru, /km_age_from=82526&km_age_to=153262/);
  assert.doesNotMatch(result.links.autoru, /price_to=/);
  assert.match(result.links.drom, /minprobeg=82526&maxprobeg=153262/);
  assert.equal(result.savings.kind, "none");
});
