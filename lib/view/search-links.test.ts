import assert from "node:assert/strict";
import test from "node:test";
import { autoruSearchUrl, dromSearchUrl, similarWindow } from "./search-links.ts";

const elantra = { brand: "Hyundai", model: "Elantra", autoruPath: "hyundai/elantra/3483538" };
const fusion = { brand: "Ford", model: "Fusion" };

test("elantra opens the verified auto.ru generation with an automatic filter", () => {
  assert.equal(
    autoruSearchUrl(elantra, { yearFrom: 2003, yearTo: 2010, priceTo: 300_000 }),
    "https://auto.ru/moskva/cars/hyundai/elantra/3483538/used/?transmission=AUTOMATIC&year_from=2003&year_to=2010&price_to=300000",
  );
});

test("a model without a generation id is searched by brand, model and years", () => {
  assert.match(autoruSearchUrl(fusion, { yearFrom: 2002, yearTo: 2012 }), /\/ford\/fusion\/used\/\?transmission=AUTOMATIC&year_from=2002&year_to=2012$/);
});

test("drom uses Moscow, automatic and the price in the path", () => {
  assert.equal(
    dromSearchUrl({ brand: "Daewoo", model: "Matiz" }, { yearFrom: 2001, yearTo: 2015, priceTo: 200_000 }),
    "https://auto.drom.ru/moscow/daewoo/matiz/do-200000/?minyear=2001&maxyear=2015&transmission=2",
  );
});

test("a similar-ad window is two years and thirty percent of mileage", () => {
  assert.deepEqual(similarWindow(2005, 117_894), { yearFrom: 2003, yearTo: 2007, kmFrom: 82_526, kmTo: 153_262 });
});
