import { rub } from "../format";
import type { Model } from "../schema";

/** Потолок и пол сбора объявлений в валидаторе. Поиск за эти границы не выходит. */
export const PRICE_MAX = 1_500_000;
export const PRICE_MIN = 100_000;
const PRICE_STEP = 10_000;

/**
 * Имена параметров площадок. В ссылку попадает только то, что уже открывалось.
 *
 * Drom, проверено на фильтре Polo 16.10.2026:
 * - годы: minyear, maxyear
 * - объём в литрах: mv, xv
 * - цена: minprice, maxprice
 * - пробег до: maxprobeg; пробег от: minprobeg (сайт сохраняет его в адресе)
 * - кузов в пути: sedan, hatchback, wagon, suv, van
 * - классический автомат: transmission[]=2 и transmission[]=5 (АКПП и SSR)
 * - transmission=2 одно — группа «Автомат»: АКПП, робот и вариатор сразу
 *
 * auto.ru, подтверждено скриншотом Polo, документацией Авто.ру и живыми адресами:
 * - годы: year_from, year_to
 * - цена: price_from, price_to
 * - объём в см³: displacement_from, displacement_to
 * - пробег: km_age_from, km_age_to
 * - кузов седан: путь body-sedan; хэтчбек: путь body-hatchback
 * - transmission=AUTOMATIC и путь transmission-automatic — группа.
 *   В выдаче Mini Hatch по transmission-automatic есть объявления «Робот».
 *
 * TODO: классический автомат на auto.ru. Когда будет ручной URL фильтра Polo
 * с одной АКПП (без робота и вариатора), подставить значение в AUTORU_CLASSIC_AUTOMATIC.
 * Пока параметр коробки в ссылку auto.ru не ставится, чтобы не открыть роботов.
 *
 * TODO: мощность на Drom и auto.ru. Имена параметров не выдуманы.
 * Ждём ручной URL Polo на Drom с фильтром ровно 110 л.с. и ручной URL Polo
 * на auto.ru: Москва, только классический автомат, 1.6, 110 л.с.
 * Второй адрес закроет и AUTORU_CLASSIC_AUTOMATIC. Пока мощности в ссылке нет,
 * хотя подпись и поле power уже знают л.с. разрешённого мотора.
 */
export const AUTORU_CLASSIC_AUTOMATIC: string | null = null;
export const DROM_POWER_FROM: string | null = null;
export const DROM_POWER_TO: string | null = null;
export const AUTORU_POWER_FROM: string | null = null;
export const AUTORU_POWER_TO: string | null = null;

const DROM_CLASSIC_AUTOMATIC = ["2", "5"] as const;

const DROM_BODY: Record<Model["body"], string> = {
  sedan: "sedan",
  hatchback: "hatchback",
  wagon: "wagon",
  crossover: "suv",
  minivan: "van",
};

/** Сегмент пути auto.ru. Нет ключа — кузов в ссылку не добавляем, имя не выдумано. */
const AUTORU_BODY: Partial<Record<Model["body"], string>> = {
  sedan: "body-sedan",
  hatchback: "body-hatchback",
};

export type SearchModel = Pick<
  Model,
  "brand" | "model" | "years" | "body" | "engines" | "gearboxes" | "mileage" | "budgetRules" | "listingRules" | "autoruPath"
>;

export type SearchContext = {
  median: number;
  p25?: number;
  p75?: number;
  /** Стартовый ориентир, а не подсчёт объявлений. Вместе с low и fallback окно не сужает. */
  isSeed?: boolean;
  isFallback?: boolean;
  confidence?: "low" | "medium" | "high";
  /** Сумма копилки. Нет числа или 0 — копилочную ссылку не строим. */
  savings?: number;
  /** Сравнение с конкретным объявлением: год ±2, пробег ±30%. Цену копилки не подставляет. */
  similar?: { year: number; mileageKm: number };
};

export type SearchEngine = { code: string; volumeL: number; hp: number | null };

export type SearchPower = { from: number; to: number };

export type MarketplaceLinks = { autoru: string; drom: string };

export type SearchSavings =
  | { kind: "links"; label: string; links: MarketplaceLinks }
  | { kind: "note"; text: string }
  | { kind: "none" };

export type SearchLinksResult = {
  years: [number, number];
  volumes: number[];
  engines: SearchEngine[];
  /** rules — годы разрешённых пар из listingRules; generation — годы поколения. */
  yearSource: "rules" | "generation";
  /** null — у разрешённого мотора нет л.с., фильтр мощности не ставится. */
  power: SearchPower | null;
  /** false — seed, low или fallback: верх окна PRICE_MAX, низ только из правила avoid. */
  measured: boolean;
  priceFrom: number;
  priceTo: number;
  kmTo: number;
  caption: string;
  links: MarketplaceLinks;
  savings: SearchSavings;
};

const grouped = new Intl.NumberFormat("ru-RU");

function slug(value: string): string {
  return value.toLowerCase().split(/[\s(]/)[0];
}

function roundPrice(value: number): number {
  return Math.round(value / PRICE_STEP) * PRICE_STEP;
}

function liters(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function cc(value: number): number {
  return Math.round(value * 1000);
}

type Pair = { code: string; volumeL: number; hp: number | null; yearFrom: number; yearTo: number };

function engineHp(hp: number | undefined): number | null {
  return hp != null && hp > 0 ? hp : null;
}

function allowedPairs(model: SearchModel): Pair[] {
  const automatics = model.gearboxes.filter((gearbox) => gearbox.type === "AT" && gearbox.verdict !== "avoid");
  const pairs: Pair[] = [];
  for (const gearbox of automatics) {
    const engines = gearbox.engineCodes?.length
      ? model.engines.filter((engine) => gearbox.engineCodes!.includes(engine.code))
      : model.engines;
    for (const engine of engines) {
      const yearFrom = Math.max(gearbox.years?.[0] ?? model.years[0], engine.years?.[0] ?? model.years[0]);
      const yearTo = Math.min(gearbox.years?.[1] ?? model.years[1], engine.years?.[1] ?? model.years[1]);
      if (yearFrom <= yearTo) pairs.push({ code: engine.code, volumeL: engine.volumeL, hp: engineHp(engine.hp), yearFrom, yearTo });
    }
  }
  return pairs;
}

function uniqueEngines(pairs: Pair[]): SearchEngine[] {
  const seen = new Set<string>();
  const engines: SearchEngine[] = [];
  for (const pair of pairs) {
    if (seen.has(pair.code)) continue;
    seen.add(pair.code);
    engines.push({ code: pair.code, volumeL: pair.volumeL, hp: pair.hp });
  }
  return engines;
}

function selectedEngines(model: SearchModel): SearchEngine[] {
  const pairs = allowedPairs(model);
  if (pairs.length) return uniqueEngines(pairs);
  const fallback = model.engines.filter((engine) => engine.recommended);
  return (fallback.length ? fallback : model.engines).map((engine) => ({
    code: engine.code,
    volumeL: engine.volumeL,
    hp: engineHp(engine.hp),
  }));
}

/** Коды моторов, которые поиск взял бы, но у которых в карточке нет л.с. */
export function enginesMissingPower(model: SearchModel): string[] {
  return selectedEngines(model).filter((engine) => engine.hp == null).map((engine) => engine.code);
}

function powerOf(engines: SearchEngine[]): SearchPower | null {
  if (!engines.length || engines.some((engine) => engine.hp == null)) return null;
  const values = engines.map((engine) => engine.hp as number);
  return { from: Math.min(...values), to: Math.max(...values) };
}

function avoidRule(model: SearchModel) {
  const rules = (model.budgetRules ?? []).filter((rule) => rule.verdict === "avoid");
  if (!rules.length) return null;
  const ceiling = Math.max(...rules.map((rule) => rule.to));
  return rules.find((rule) => rule.to === ceiling) ?? null;
}

function isMeasured(context: SearchContext): boolean {
  return context.isSeed === false && context.isFallback !== true && (context.confidence === "medium" || context.confidence === "high");
}

function priceWindow(model: SearchModel, context: SearchContext): { priceFrom: number; priceTo: number; measured: boolean } {
  const rule = avoidRule(model);
  // Стартовый ориентир — не медиана. Сужать вокруг него значит отрезать нормальные машины.
  if (!isMeasured(context)) {
    return { priceFrom: rule ? rule.to : PRICE_MIN, priceTo: PRICE_MAX, measured: false };
  }
  const quartiles = context.p25 != null && context.p25 > 0 && context.p75 != null && context.p75 > 0;
  const rawFrom = quartiles ? context.p25! * 0.9 : context.median * 0.75;
  const rawTo = quartiles ? context.p75! * 1.1 : context.median * 1.25;
  const priceFrom = roundPrice(rule ? Math.max(rule.to, rawFrom) : rawFrom);
  let priceTo = roundPrice(Math.min(PRICE_MAX, rawTo));
  if (priceTo < priceFrom) priceTo = PRICE_MAX;
  return { priceFrom, priceTo, measured: true };
}

function cheapNote(model: SearchModel, savings: number, priceFrom: number): string {
  const rule = avoidRule(model);
  const head = `За ${rub(savings)} нормальных ${model.model} с автоматом почти нет — дешевле ${rub(priceFrom)}`;
  if (rule && /такси/i.test(rule.reason)) return `${head} в основном такси`;
  if (rule) return `${head}. ${rule.reason}`;
  return `${head}.`;
}

type Window = {
  yearFrom: number;
  yearTo: number;
  volumes: number[];
  power?: SearchPower | null;
  priceFrom?: number;
  priceTo?: number;
  kmFrom?: number;
  kmTo?: number;
};

function autoruUrl(model: SearchModel, window: Window): string {
  const tail = model.autoruPath ?? `${slug(model.brand)}/${slug(model.model)}`;
  const body = AUTORU_BODY[model.body];
  const params = new URLSearchParams();
  if (AUTORU_CLASSIC_AUTOMATIC) params.set("transmission", AUTORU_CLASSIC_AUTOMATIC);
  params.set("year_from", String(window.yearFrom));
  params.set("year_to", String(window.yearTo));
  if (window.priceFrom != null) params.set("price_from", String(window.priceFrom));
  if (window.priceTo != null) params.set("price_to", String(window.priceTo));
  if (window.volumes.length) {
    const amounts = window.volumes.map(cc);
    params.set("displacement_from", String(Math.min(...amounts)));
    params.set("displacement_to", String(Math.max(...amounts)));
  }
  if (window.power && AUTORU_POWER_FROM && AUTORU_POWER_TO) {
    params.set(AUTORU_POWER_FROM, String(window.power.from));
    params.set(AUTORU_POWER_TO, String(window.power.to));
  }
  if (window.kmFrom != null) params.set("km_age_from", String(window.kmFrom));
  if (window.kmTo != null) params.set("km_age_to", String(window.kmTo));
  const query = params.toString();
  const bodyPath = body ? `${body}/` : "";
  return `https://auto.ru/moskva/cars/${tail}/used/${bodyPath}?${query}`;
}

function dromUrl(model: SearchModel, window: Window): string {
  const parts = [`minyear=${window.yearFrom}`, `maxyear=${window.yearTo}`];
  if (window.volumes.length) {
    const amounts = window.volumes.map(liters);
    parts.push(`mv=${amounts[0]}`, `xv=${amounts[amounts.length - 1]}`);
  }
  if (window.power && DROM_POWER_FROM && DROM_POWER_TO) {
    parts.push(`${DROM_POWER_FROM}=${window.power.from}`, `${DROM_POWER_TO}=${window.power.to}`);
  }
  if (window.priceFrom != null) parts.push(`minprice=${window.priceFrom}`);
  if (window.priceTo != null) parts.push(`maxprice=${window.priceTo}`);
  if (window.kmFrom != null) parts.push(`minprobeg=${window.kmFrom}`);
  if (window.kmTo != null) parts.push(`maxprobeg=${window.kmTo}`);
  for (const value of DROM_CLASSIC_AUTOMATIC) parts.push(`transmission[]=${value}`);
  return `https://auto.drom.ru/moscow/${slug(model.brand)}/${slug(model.model)}/${DROM_BODY[model.body]}/?${parts.join("&")}`;
}

function linksFor(model: SearchModel, window: Window): MarketplaceLinks {
  return { autoru: autoruUrl(model, window), drom: dromUrl(model, window) };
}

export function similarWindow(year: number, mileageKm: number): { yearFrom: number; yearTo: number; kmFrom?: number; kmTo?: number } {
  const window: { yearFrom: number; yearTo: number; kmFrom?: number; kmTo?: number } = { yearFrom: year - 2, yearTo: year + 2 };
  if (mileageKm > 0) {
    window.kmFrom = Math.round(mileageKm * 0.7);
    window.kmTo = Math.round(mileageKm * 1.3);
  }
  return window;
}

function specText(engines: SearchEngine[]): string {
  const byVolume = new Map<number, number[]>();
  for (const engine of engines) {
    const known = byVolume.get(engine.volumeL) ?? [];
    if (engine.hp != null && !known.includes(engine.hp)) known.push(engine.hp);
    byVolume.set(engine.volumeL, known);
  }
  return [...byVolume.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([volume, powers]) => {
      const size = liters(volume);
      if (!powers.length) return size;
      powers.sort((a, b) => a - b);
      const hp = powers.length === 1 ? String(powers[0]) : `${powers[0]}–${powers[powers.length - 1]}`;
      return `${size} ${hp} л.с.`;
    })
    .join(", ");
}

function captionOf(
  years: [number, number],
  engines: SearchEngine[],
  priceFrom: number,
  priceTo: number,
  kmTo: number,
  measured: boolean,
): string {
  const parts = [`${years[0]}–${years[1]}`, specText(engines), "АКПП"];
  const modelFloor = !measured && priceFrom > PRICE_MIN;
  if (measured) parts.push(`${grouped.format(priceFrom)} – ${grouped.format(priceTo)} ₽`);
  else if (modelFloor) parts.push(`от ${grouped.format(priceFrom)} ₽`);
  parts.push(`до ${grouped.format(kmTo)} км`);
  const line = parts.join(", ");
  if (measured) return line;
  const from = modelFloor ? ` от ${grouped.format(priceFrom)} ₽` : "";
  return `${line}. Цена пока не измерена — показываем весь рынок${from}`;
}

/** Все ссылки на Авто.ру и Drom в проекте строятся здесь. */
export function searchLinks(model: SearchModel, context: SearchContext): SearchLinksResult {
  const pairs = allowedPairs(model);
  const engines = selectedEngines(model);
  const volumes = [...new Set(engines.map((engine) => engine.volumeL))].sort((a, b) => a - b);
  const power = powerOf(engines);
  const yearSource = model.listingRules?.length && pairs.length ? "rules" : "generation";
  const years: [number, number] =
    yearSource === "rules"
      ? [Math.min(...pairs.map((pair) => pair.yearFrom)), Math.max(...pairs.map((pair) => pair.yearTo))]
      : [model.years[0], model.years[1]];
  const { priceFrom, priceTo, measured } = priceWindow(model, context);
  const kmTo = model.mileage.avoidFrom;
  const market: Window = { yearFrom: years[0], yearTo: years[1], volumes, power, priceFrom, priceTo, kmTo };

  if (context.similar) {
    const near = similarWindow(context.similar.year, context.similar.mileageKm);
    const window: Window = {
      yearFrom: near.yearFrom,
      yearTo: near.yearTo,
      volumes,
      power,
      kmFrom: near.kmFrom,
      kmTo: near.kmTo,
    };
    return {
      years,
      volumes,
      engines,
      power,
      yearSource,
      measured,
      priceFrom,
      priceTo,
      kmTo,
      caption: captionOf(years, engines, priceFrom, priceTo, kmTo, measured),
      links: linksFor(model, window),
      savings: { kind: "none" },
    };
  }

  const savings = context.savings && context.savings > 0 ? context.savings : undefined;
  const pocket: SearchSavings =
    savings == null
      ? { kind: "none" }
      : savings >= priceFrom
        ? {
            kind: "links",
            label: `В пределах копилки (до ${rub(savings)})`,
            links: linksFor(model, { ...market, priceTo: savings }),
          }
        : { kind: "note", text: cheapNote(model, savings, priceFrom) };

  return {
    years,
    volumes,
    engines,
    power,
    yearSource,
    measured,
    priceFrom,
    priceTo,
    kmTo,
    caption: captionOf(years, engines, priceFrom, priceTo, kmTo, measured),
    links: linksFor(model, market),
    savings: pocket,
  };
}
