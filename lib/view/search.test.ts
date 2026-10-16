import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { rub } from "../format.ts";
import { Model } from "../schema.ts";
import { PRICE_MIN, enginesMissingPower, searchLinks, similarWindow } from "./search.ts";

function load(slug: string) {
  return Model.parse(JSON.parse(fs.readFileSync(`data/models/${slug}.json`, "utf8")));
}

const grouped = new Intl.NumberFormat("ru-RU");

test("Polo seed at 250 000 opens the whole market from the taxi floor, not from the orientir", () => {
  const result = searchLinks(load("volkswagen-polo-sedan"), { median: 850_000, isSeed: true, confidence: "low", savings: 250_000 });
  assert.equal(result.measured, false);
  assert.equal(result.priceFrom, 800_000);
  assert.equal(result.priceTo, 1_500_000);
  assert.deepEqual(result.power, { from: 110, to: 110 });
  assert.deepEqual(result.years, [2015, 2020]);
  assert.deepEqual(result.volumes, [1.6]);
  assert.deepEqual(result.engines.map((engine) => engine.code), ["CWVA"]);
  assert.deepEqual(result.engines.map((engine) => engine.hp), [110]);
  assert.equal(result.yearSource, "rules");
  assert.equal(result.kmTo, 230_000);
  assert.equal(
    result.caption,
    `2015–2020, 1.6 110 л.с., АКПП, от ${grouped.format(800_000)} ₽, до ${grouped.format(230_000)} км. Цена пока не измерена — показываем весь рынок от ${grouped.format(800_000)} ₽`,
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
  assert.match(result.links.drom, /minprice=800000&maxprice=1500000/);
  assert.match(result.links.drom, /minpower=110&maxpower=110/);
  assert.match(result.links.drom, /maxprobeg=230000/);
  assert.match(result.links.drom, /transmission\[\]=2&transmission\[\]=5/);
  assert.doesNotMatch(result.links.drom, /(?:^|[?&])transmission=2(?:&|$)/);
  assert.doesNotMatch(result.links.drom, /do-250000/);
  assert.match(result.links.autoru, /\/volkswagen\/polo\/20113124\/used\/body-sedan\/\?/);
  assert.match(result.links.autoru, /year_from=2015&year_to=2020/);
  assert.match(result.links.autoru, /price_from=800000&price_to=1500000/);
  assert.doesNotMatch(result.links.autoru, /power_from|power_to|engine_power/i);
  assert.match(result.links.autoru, /displacement_from=1600&displacement_to=1600/);
  assert.match(result.links.autoru, /km_age_to=230000/);
  assert.doesNotMatch(result.links.autoru, /transmission=/);
});

test("a measured Polo uses the quartile band and still keeps the taxi floor", () => {
  const result = searchLinks(load("volkswagen-polo-sedan"), {
    median: 1_000_000,
    p25: 900_000,
    p75: 1_200_000,
    isSeed: false,
    isFallback: false,
    confidence: "high",
  });
  assert.equal(result.measured, true);
  assert.equal(result.priceFrom, 810_000);
  assert.equal(result.priceTo, 1_320_000);
  assert.doesNotMatch(result.caption, /не измерена/);
  assert.match(result.caption, /1\.6 110 л\.с\., АКПП/);
});

test("Elantra XD seed has no model floor and stays at 105 hp, not the HD's 122", () => {
  const result = searchLinks(load("hyundai-elantra-xd"), { median: 200_000, isSeed: true, confidence: "low" });
  assert.equal(result.measured, false);
  assert.equal(result.priceFrom, PRICE_MIN);
  assert.equal(result.priceTo, 1_500_000);
  assert.deepEqual(result.power, { from: 105, to: 105 });
  assert.deepEqual(result.engines.map((engine) => engine.hp), [105]);
  assert.match(result.links.drom, /minprice=100000&maxprice=1500000/);
  assert.match(result.links.drom, /minpower=105&maxpower=105/);
  assert.doesNotMatch(result.caption, /от /);
  assert.match(result.caption, /Цена пока не измерена — показываем весь рынок/);
  assert.match(result.caption, /1\.6 105 л\.с\./);
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

test("an allowed engine without horsepower does not invent a power filter", () => {
  const model = load("volkswagen-polo-sedan");
  const engine = model.engines.find((item) => item.code === "CWVA");
  assert.ok(engine);
  (engine as { hp?: number }).hp = undefined;
  assert.deepEqual(enginesMissingPower(model), ["CWVA"]);
  const result = searchLinks(model, { median: 850_000, isSeed: true, confidence: "low" });
  assert.equal(result.power, null);
  assert.doesNotMatch(result.caption, /л\.с\./);
  assert.doesNotMatch(result.links.drom, /power/i);
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
