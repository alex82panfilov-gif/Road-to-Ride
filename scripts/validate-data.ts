import fs from "node:fs";
import path from "node:path";
import { Model, SnapshotFile } from "../lib/schema.ts";

const root = path.resolve(import.meta.dirname, "..");
const dataDir = path.join(root, "data");
const errors: string[] = [];
const warnings: string[] = [];

function read(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
}

const modelFiles = fs.readdirSync(path.join(dataDir, "models")).filter((name) => name.endsWith(".json"));
const models = modelFiles.map((name) => {
  const parsed = Model.safeParse(read(path.join(dataDir, "models", name)));
  if (!parsed.success) {
    errors.push(`${name}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    return null;
  }
  if (parsed.data.slug !== name.replace(/\.json$/, "")) errors.push(`${name}: slug не совпадает с именем файла`);
  return parsed.data;
});

const slugs = new Set(models.filter((model) => model !== null).map((model) => model.slug));
const snapshotNames = fs.readdirSync(path.join(dataDir, "snapshots")).filter((name) => name.endsWith(".json")).sort();
const months = snapshotNames.map((name) => {
  const parsed = SnapshotFile.safeParse(read(path.join(dataDir, "snapshots", name)));
  if (!parsed.success) {
    errors.push(`${name}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    return null;
  }
  if (parsed.data.month !== name.replace(/\.json$/, "")) errors.push(`${name}: месяц не совпадает с именем файла`);
  for (const snapshot of parsed.data.snapshots) {
    if (!slugs.has(snapshot.slug)) errors.push(`${name}: неизвестная модель ${snapshot.slug}`);
    if (snapshot.sampleSize < 8 && snapshot.confidence !== "low") {
      errors.push(`${snapshot.slug} ${snapshot.month}: меньше 8 объявлений, confidence должен быть low`);
    }
    if (snapshot.confidence === "low" && !snapshot.notes) {
      warnings.push(`${snapshot.slug} ${snapshot.month}: низкая уверенность без пояснения`);
    }
    if (snapshot.p25 > snapshot.median || snapshot.median > snapshot.p75) {
      errors.push(`${snapshot.slug} ${snapshot.month}: нарушен порядок p25 ≤ медиана ≤ p75`);
    }
  }
  const seen = new Set(parsed.data.snapshots.map((snapshot) => snapshot.slug));
  for (const slug of slugs) {
    if (!seen.has(slug)) errors.push(`${name}: нет цены для ${slug}`);
  }
  return parsed.data;
});

const validMonths = months.filter((month) => month !== null);
for (let index = 1; index < validMonths.length; index++) {
  const current = validMonths[index];
  const previous = validMonths[index - 1];
  for (const snapshot of current.snapshots) {
    const before = previous.snapshots.find((item) => item.slug === snapshot.slug);
    if (!before || before.median === 0) continue;
    const delta = snapshot.median / before.median - 1;
    if (Math.abs(delta) > 0.15) {
      warnings.push(`${snapshot.slug}: цена изменилась на ${(delta * 100).toFixed(0)}% (${previous.month} → ${current.month})`);
    }
  }
}

for (const warning of warnings) console.warn(`WARN ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}
console.log(`OK: ${modelFiles.length} моделей, ${snapshotNames.length} снимков, предупреждений: ${warnings.length}`);
