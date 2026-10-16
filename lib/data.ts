import fs from "node:fs";
import path from "node:path";
import { meta, realPrice } from "./meta";
import { bestGearbox, findModel, type CatalogItem, type PricePoint } from "./market";
import { modelScore } from "./score";
import { Model, SnapshotFile, type Model as CarModel, type SnapshotFile as MonthFile } from "./schema";

const dataDir = path.join(process.cwd(), "data");

function readJson(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
}

function readDir(subdir: string): string[] {
  return fs
    .readdirSync(path.join(dataDir, subdir))
    .filter((name) => name.endsWith(".json"))
    .sort();
}

export const models: CarModel[] = readDir("models").map((name) => Model.parse(readJson(path.join(dataDir, "models", name))));

export const snapshotFiles: MonthFile[] = readDir("snapshots").map((name) =>
  SnapshotFile.parse(readJson(path.join(dataDir, "snapshots", name))),
);

export const latestSnapshot = snapshotFiles[snapshotFiles.length - 1];

export function getModel(slug: string): CarModel | undefined {
  const key = slug.toLowerCase();
  return models.find((model) => model.slug === key || model.aliases?.includes(key));
}

export function priceHistory(slug: string): PricePoint[] {
  return snapshotFiles.flatMap((file) =>
    file.snapshots
      .filter((snapshot) => snapshot.slug === slug)
      .map((snapshot) => ({
        month: snapshot.month,
        p25: snapshot.p25,
        median: snapshot.median,
        p75: snapshot.p75,
        medianMileageKm: snapshot.medianMileageKm,
        confidence: snapshot.confidence,
        sampleSize: snapshot.sampleSize,
      })),
  );
}

export function latestPrice(slug: string) {
  return latestSnapshot?.snapshots.find((snapshot) => snapshot.slug === slug);
}

function recommendedHp(model: CarModel): number {
  return model.engines.find((engine) => engine.recommended)?.hp ?? model.engines[0].hp;
}

export const catalog: CatalogItem[] = models.map((model) => {
  const price = latestPrice(model.slug);
  if (!price) throw new Error(`Нет цены для ${model.slug}`);
  return {
    slug: model.slug,
    aliases: model.aliases ?? [],
    brand: model.brand,
    model: model.model,
    generation: model.generation,
    years: model.years,
    body: model.body,
    summary: model.summary ?? "",
    fuelLPer100: model.fuelLPer100 ?? 8,
    hp: recommendedHp(model),
    score: modelScore(model.subScores),
    subScores: model.subScores,
    median: price.median,
    p25: price.p25,
    p75: price.p75,
    medianMileageKm: price.medianMileageKm,
    medianYear: price.medianYear,
    confidence: price.confidence,
    sampleSize: price.sampleSize,
    month: price.month,
    notes: price.notes,
    bestGearbox: bestGearbox(model),
  };
});

export function catalogRealPrice(item: CatalogItem): number {
  return realPrice(item.median, item.hp);
}

export function findCatalog(slug: string): CatalogItem | undefined {
  return findModel(catalog, slug);
}

export const dataUpdatedLabel = meta.updatedAt;
