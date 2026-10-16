#!/usr/bin/env tsx
/**
 * Полуручной сбор: CSV с объявлениями → снимок schemaVersion 2.
 *   npm run import:listings -- 2026-10
 * Читает data/raw/2026-10-manual.csv и обновляет только эти модели
 * в data/snapshots/2026-10.json. Имена и телефоны не записываются.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Model, SnapshotFile, type TListing, type TModel, type TSnapshotFile } from "../lib/schema.ts";
import { gearboxCheck, reviewRaw } from "./validate-data.ts";

const PHONE_RE = /(\+7|\b8)[\s(-]*9\d{2}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/;
const COLUMNS = ["slug", "platform", "listingId", "year", "mileageKm", "priceRub", "engine", "gearbox"] as const;

const PLATFORM_URL: Record<TListing["platform"], string> = {
  drom: "https://auto.drom.ru/",
  autoru: "https://auto.ru/",
  avito: "https://www.avito.ru/",
  other: "https://www.autostat.ru/",
};

export type ManualRow = {
  slug: string;
  platform: TListing["platform"];
  listingId: string;
  year: number;
  mileageKm: number;
  priceRub: number;
  engine: string;
  gearbox: string;
};

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (char !== "\r") cell += char;
  }
  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

function platformOf(raw: string): TListing["platform"] | null {
  const value = raw.trim().toLowerCase().replace(".", "");
  if (value === "drom") return "drom";
  if (value === "autoru" || value === "auto.ru") return "autoru";
  if (value === "avito") return "avito";
  if (value === "other") return "other";
  return null;
}

export function gearboxTypeOf(raw: string): TListing["gearboxType"] | null {
  const value = raw.toLowerCase();
  if (/dsg|dq200|dq250|dct|двумя сцеплен/.test(value)) return "DCT";
  if (/cvt|вариатор/.test(value)) return "CVT";
  if (/amt|durashift|робот/.test(value)) return "AMT";
  if (/мкпп|механик|\bmt\b/.test(value)) return "MT";
  if (/акпп|автомат|aisin|09g|4f27e|tiptronic|типтроник|\bat\b/.test(value)) return "AT";
  return null;
}

function engineLitres(raw: string): number | null {
  const match = raw.match(/(\d+[.,]\d+)/);
  if (!match) return null;
  return Number(match[1].replace(",", "."));
}

export function rowsFromCsv(text: string): { rows: ManualRow[]; errors: string[] } {
  if (PHONE_RE.test(text)) return { rows: [], errors: ["В файле похоже на номер телефона. Такие данные не импортируются."] };
  const table = parseCsv(text);
  if (!table.length) return { rows: [], errors: ["Файл пустой."] };
  const header = table[0].map((value) => value.trim());
  if (header.join(",") !== COLUMNS.join(",")) {
    return { rows: [], errors: [`Заголовок должен быть: ${COLUMNS.join(",")}`] };
  }
  const rows: ManualRow[] = [];
  const errors: string[] = [];
  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const [slug, platformRaw, listingId, yearRaw, mileageRaw, priceRaw, engine, gearbox] = cells;
    const platform = platformOf(platformRaw ?? "");
    const year = Number(yearRaw);
    const mileageKm = Number(mileageRaw);
    const priceRub = Number(String(priceRaw).replace(/\s/g, ""));
    if (!slug || !listingId || !engine || !gearbox) errors.push(`Строка ${line}: пустое обязательное поле.`);
    if (!platform) errors.push(`Строка ${line}: площадка «${platformRaw}» не из drom, autoru, avito, other.`);
    if (!Number.isInteger(year) || year < 1980 || year > 2035) errors.push(`Строка ${line}: год не похож на год.`);
    if (!Number.isInteger(mileageKm) || mileageKm < 0) errors.push(`Строка ${line}: пробег должен быть целым.`);
    if (!Number.isInteger(priceRub) || priceRub <= 0) errors.push(`Строка ${line}: цена должна быть целым числом рублей.`);
    if (platform && slug && listingId && Number.isInteger(year) && Number.isInteger(mileageKm) && Number.isInteger(priceRub) && engine && gearbox) {
      rows.push({ slug, platform, listingId, year, mileageKm, priceRub, engine, gearbox });
    }
  });
  return { rows, errors };
}

export function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
}

export function toListing(row: ManualRow, model: TModel): { listing: TListing | null; error: string | null } {
  const engineL = engineLitres(row.engine);
  if (engineL === null) return { listing: null, error: `${row.slug} ${row.listingId}: в моторе нет объёма, например 1.6.` };
  const gearboxType = gearboxTypeOf(row.gearbox);
  if (!gearboxType) return { listing: null, error: `${row.slug} ${row.listingId}: коробку «${row.gearbox}» не удалось отнести к AT, CVT, DCT, AMT или MT.` };
  const sameVolume = model.engines.filter((engine) => Math.abs(engine.volumeL - engineL) < 0.05);
  const hp = sameVolume.length === 1 ? sameVolume[0].hp : undefined;
  const listing: TListing = {
    id: row.listingId,
    platform: row.platform,
    year: row.year,
    mileageKm: row.mileageKm,
    priceRub: row.priceRub,
    engineL,
    ...(hp ? { hp } : {}),
    gearboxType,
    gearboxRaw: row.gearbox,
  };
  const gearboxError = gearboxCheck(model, listing);
  if (gearboxError) return { listing: null, error: `${row.slug} ${row.listingId}: ${gearboxError}` };
  return { listing, error: null };
}

function confidenceOf(listings: TListing[]): "low" | "medium" | "high" {
  const platforms = new Set(listings.map((listing) => listing.platform));
  if (listings.length >= 15 && platforms.size >= 2) return "high";
  if (listings.length >= 8 && platforms.size >= 2) return "medium";
  return "low";
}

export function applyRows(file: TSnapshotFile, rows: ManualRow[], models: Map<string, TModel>): { file: TSnapshotFile; errors: string[] } {
  const errors: string[] = [];
  const bySlug = new Map<string, ManualRow[]>();
  const seen = new Set<string>();
  for (const row of rows) {
    if (!models.has(row.slug)) errors.push(`Нет карточки ${row.slug}.`);
    const key = `${row.platform}:${row.listingId}`;
    if (seen.has(`${row.slug}:${key}`)) errors.push(`Повтор ${row.slug} ${key}.`);
    seen.add(`${row.slug}:${key}`);
    bySlug.set(row.slug, [...(bySlug.get(row.slug) ?? []), row]);
  }
  if (errors.length) return { file, errors };

  const snapshots = file.snapshots.map((snapshot) => {
    const group = bySlug.get(snapshot.slug);
    if (!group) return snapshot;
    const model = models.get(snapshot.slug)!;
    const listings: TListing[] = [];
    for (const row of group) {
      const built = toListing(row, model);
      if (built.error || !built.listing) errors.push(built.error ?? `${row.slug}: объявление не собралось.`);
      else listings.push(built.listing);
    }
    if (!listings.length || listings.length !== group.length) return snapshot;
    const prices = listings.map((listing) => listing.priceRub);
    const platforms = [...new Set(listings.map((listing) => listing.platform))];
    return {
      ...snapshot,
      sampleSize: listings.length,
      p25: quantile(prices, 0.25),
      median: quantile(prices, 0.5),
      p75: quantile(prices, 0.75),
      medianMileageKm: quantile(listings.map((listing) => listing.mileageKm), 0.5),
      medianYear: quantile(listings.map((listing) => listing.year), 0.5),
      confidence: confidenceOf(listings),
      sources: platforms.map((platform) => PLATFORM_URL[platform]),
      notes: "Полуручной сбор: строки из CSV, без имён и телефонов. Проверьте выборку валидатором.",
      listings,
    };
  });

  const missing = [...bySlug.keys()].filter((slug) => !file.snapshots.some((snapshot) => snapshot.slug === slug));
  for (const slug of missing) errors.push(`${slug} нет в снимке этого месяца. Сначала добавьте пустую карточку снимка.`);
  return {
    file: { ...file, schemaVersion: 2, snapshots },
    errors,
  };
}

export function listingIssues(file: TSnapshotFile, slugs: string[], models: Map<string, TModel>): string[] {
  const reviewed = reviewRaw(JSON.stringify({ ...file, seed: false }), models, null);
  const wanted = new Set(slugs);
  return reviewed.issues
    .filter((issue) => issue.level === "error" && wanted.has(issue.slug))
    .map((issue) => `${issue.slug}: ${issue.msg}`);
}

function loadModels(dir: string): Map<string, TModel> {
  const map = new Map<string, TModel>();
  for (const name of fs.readdirSync(dir).filter((file) => file.endsWith(".json"))) {
    const model = Model.parse(JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")));
    map.set(model.slug, model);
  }
  return map;
}

function main() {
  const month = process.argv[2];
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    console.error("Укажите месяц: npm run import:listings -- 2026-10");
    process.exit(1);
  }
  const csvPath = path.join(process.cwd(), "data", "raw", `${month}-manual.csv`);
  const snapPath = path.join(process.cwd(), "data", "snapshots", `${month}.json`);
  if (!fs.existsSync(csvPath)) {
    console.error(`Нет ${csvPath}. Заголовок лежит в data/raw/TEMPLATE.csv.`);
    process.exit(1);
  }
  const parsed = rowsFromCsv(fs.readFileSync(csvPath, "utf8"));
  if (parsed.errors.length) {
    console.error(parsed.errors.join("\n"));
    process.exit(1);
  }
  if (!parsed.rows.length) {
    console.log("В CSV только заголовок. Снимок не менялся.");
    return;
  }
  const current = SnapshotFile.parse(JSON.parse(fs.readFileSync(snapPath, "utf8")));
  const models = loadModels(path.join(process.cwd(), "data", "models"));
  const applied = applyRows(current, parsed.rows, models);
  if (applied.errors.length) {
    console.error(applied.errors.join("\n"));
    process.exit(1);
  }
  const slugs = [...new Set(parsed.rows.map((row) => row.slug))];
  const blocked = listingIssues(applied.file, slugs, models);
  if (blocked.length) {
    console.error(blocked.join("\n"));
    process.exit(1);
  }
  fs.writeFileSync(snapPath, JSON.stringify(applied.file, null, 2) + "\n");
  console.log(`Обновлены модели: ${slugs.join(", ")}. Файл остаётся стартовым, пока в нём есть модели без объявлений.`);
  console.log("Объявления этих моделей уже проверены теми же правилами, что и валидатор. npm run validate пока подпишет месяц как стартовый ориентир.");
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entry) main();
