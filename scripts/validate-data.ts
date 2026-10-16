#!/usr/bin/env tsx
/**
 * Проверка данных Road to Ride.
 *   npm run validate                    — последний снимок
 *   npm run validate -- 2026-11         — конкретный месяц
 *   npm run validate -- 2026-11 --write — отклонённые модели перенести во flags и сохранить файл
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ZodError } from "zod";
import { Model, SnapshotFile, type TListing, type TModel, type TSnapshot, type TSnapshotFile } from "../lib/schema.ts";
import { enginesMissingPower } from "../lib/view/search.ts";

const MIN_PUBLISH = 5;
const MIN_MEDIUM = 8;
const MIN_HIGH = 15;
const MAX_MONTH_DELTA = 0.15;
const MAX_SPREAD = 1.5;
const TAXI_KM_PER_YEAR = 30_000;
const QUANTILE_TOLERANCE = 0.01;
const PRICE_MIN = 100_000;
const PRICE_MAX = 1_500_000;
const BUDGET_MAX = 1_000_000;
const PHONE_RE = /(\+7|\b8)[\s(-]*9\d{2}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/;

export type Issue = { level: "error" | "warn"; slug: string; msg: string };
export type Verdict = "publish" | "fallback" | "reject" | "seed";

const FILE = "(файл)";

const rub = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";
const fmtZod = (error: ZodError) => error.issues.slice(0, 6).map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`).join("; ");

function quantile(xs: number[], q: number) {
  const sorted = [...xs].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
}

const near = (a: number, b: number, tol = QUANTILE_TOLERANCE) => Math.abs(a - b) <= Math.max(1, b * tol);

export function gearboxCheck(model: TModel, listing: TListing): string | null {
  const engineCodes = model.engines.filter((engine) => Math.abs(engine.volumeL - listing.engineL) < 0.05).map((engine) => engine.code);
  if (!engineCodes.length) return `у модели нет мотора ${listing.engineL} л`;
  const fits = (gearbox: TModel["gearboxes"][number]) =>
    (!gearbox.engineCodes || gearbox.engineCodes.some((code) => engineCodes.includes(code))) &&
    (!gearbox.years || (listing.year >= gearbox.years[0] && listing.year <= gearbox.years[1]));
  const candidates = model.gearboxes.filter((gearbox) => gearbox.type === listing.gearboxType && fits(gearbox));
  if (!candidates.length) {
    const real = model.gearboxes.filter((gearbox) => gearbox.type !== "MT" && fits(gearbox)).map((gearbox) => gearbox.name);
    return `с мотором ${listing.engineL} л и ${listing.year} г. не бывает коробки ${listing.gearboxType}` + (real.length ? ` (на деле: ${real.join(", ")})` : "");
  }
  if (candidates.every((gearbox) => gearbox.verdict === "avoid")) return `коробка «${candidates[0].name}» в списке «избегать»`;
  return null;
}

function validateSnapshot(issues: Issue[], snapshot: TSnapshot, model: TModel, prev: TSnapshot | undefined, fileMonth: string, isSeed: boolean) {
  const err = (msg: string) => issues.push({ level: "error", slug: snapshot.slug, msg });
  const warn = (msg: string) => issues.push({ level: "warn", slug: snapshot.slug, msg });
  if (snapshot.month !== fileMonth) err(`month ${snapshot.month} не совпадает с файлом ${fileMonth}`);
  if (!(snapshot.p25 <= snapshot.median && snapshot.median <= snapshot.p75)) err("нарушено p25 ≤ медиана ≤ p75");
  if (snapshot.medianYear < model.years[0] || snapshot.medianYear > model.years[1]) {
    err(`медианный год ${snapshot.medianYear} вне поколения ${model.years.join("–")}`);
  }

  if (!isSeed) {
    const listings = snapshot.listings ?? [];
    if (!listings.length) {
      err("нет массива listings — цифры нельзя проверить");
      return;
    }
    if (snapshot.sampleSize !== listings.length) err(`sampleSize ${snapshot.sampleSize} ≠ числу объявлений ${listings.length}`);

    const ids = new Set<string>();
    for (const listing of listings) {
      const key = `${listing.platform}:${listing.id}`;
      if (ids.has(key)) err(`дубль объявления ${key}`);
      ids.add(key);
    }
    for (let i = 0; i < listings.length; i++) {
      for (let j = i + 1; j < listings.length; j++) {
        const left = listings[i];
        const right = listings[j];
        if (
          left.platform !== right.platform &&
          left.year === right.year &&
          Math.abs(left.mileageKm - right.mileageKm) < 1000 &&
          near(left.priceRub, right.priceRub, 0.02)
        ) {
          warn(`похоже на одну машину на двух площадках: ${left.platform}:${left.id} и ${right.platform}:${right.id}`);
        }
      }
    }

    const nowYear = Number(fileMonth.slice(0, 4));
    for (const listing of listings) {
      const tag = `${listing.platform}:${listing.id}`;
      if (listing.year < model.years[0] || listing.year > model.years[1]) err(`${tag}: ${listing.year} г. вне поколения`);
      if (listing.priceRub < PRICE_MIN || listing.priceRub > PRICE_MAX) err(`${tag}: цена ${rub(listing.priceRub)} вне окна сбора`);
      if (listing.mileageKm > 600_000) err(`${tag}: пробег ${listing.mileageKm} км неправдоподобен`);
      const gearbox = gearboxCheck(model, listing);
      if (gearbox) err(`${tag}: ${gearbox}`);
      const kmPerYear = listing.mileageKm / Math.max(0.5, nowYear - listing.year + 0.5);
      if (kmPerYear > TAXI_KM_PER_YEAR) warn(`${tag}: ${Math.round(kmPerYear / 1000)} тыс. км/год — возможно такси`);
      if (listing.mileageKm >= model.mileage.avoidFrom) warn(`${tag}: пробег выше порога «не рассматривать» (${model.mileage.avoidFrom} км)`);
    }

    const prices = listings.map((listing) => listing.priceRub);
    const calc = {
      p25: quantile(prices, 0.25),
      median: quantile(prices, 0.5),
      p75: quantile(prices, 0.75),
      medianMileageKm: quantile(listings.map((listing) => listing.mileageKm), 0.5),
      medianYear: quantile(listings.map((listing) => listing.year), 0.5),
    };
    for (const key of ["p25", "median", "p75", "medianMileageKm"] as const) {
      if (!near(snapshot[key], calc[key])) err(`${key}: заявлено ${snapshot[key]}, по объявлениям ${calc[key]}`);
    }
    if (Math.abs(snapshot.medianYear - calc.medianYear) > 0.5) err(`medianYear: заявлено ${snapshot.medianYear}, по объявлениям ${calc.medianYear}`);

    const platforms = new Set(listings.map((listing) => listing.platform));
    if (listings.length < MIN_MEDIUM && snapshot.confidence !== "low") err(`${listings.length} объявл. — уверенность должна быть low`);
    if (snapshot.confidence === "high" && (listings.length < MIN_HIGH || platforms.size < 2)) err(`high требует ≥${MIN_HIGH} объявл. и ≥2 площадок`);
    if (platforms.size < 2) warn("одна площадка");
    if (listings.length < MIN_PUBLISH) warn(`${listings.length} объявл. — на сайте останется прошлая цена`);
  }

  if (snapshot.p25 > 0 && snapshot.p75 / snapshot.p25 > MAX_SPREAD) {
    warn(`большой разброс цен (p75/p25 = ${(snapshot.p75 / snapshot.p25).toFixed(2)}) — проверить выборку`);
  }
  if (snapshot.median > BUDGET_MAX) warn(`медиана ${rub(snapshot.median)} выше 1 млн — на сайте «пока вне бюджета»`);
  if (prev) {
    const delta = snapshot.median / prev.median - 1;
    if (Math.abs(delta) > MAX_MONTH_DELTA) warn(`медиана изменилась на ${(delta * 100).toFixed(0)}% (${rub(prev.median)} → ${rub(snapshot.median)})`);
  }
}

/** Предупреждения карточки, которые не зависят от снимка цен. */
export function modelCardIssues(model: TModel): Issue[] {
  const issues: Issue[] = [];
  if (!model.listingRules?.length) {
    issues.push({
      level: "warn",
      slug: model.slug,
      msg: "нет listingRules — поиск на площадках берёт годы поколения, а не разрешённые пары мотор/коробка",
    });
  }
  for (const code of enginesMissingPower(model)) {
    issues.push({
      level: "warn",
      slug: model.slug,
      msg: `мотор «${code}» без мощности — фильтр л.с. в поиске не ставится`,
    });
  }
  return issues;
}

export function reviewRaw(raw: string, models: Map<string, TModel>, previous: TSnapshotFile | null) {
  const issues: Issue[] = [];
  const verdicts = new Map<string, Verdict>();
  if (PHONE_RE.test(raw)) issues.push({ level: "error", slug: FILE, msg: "похоже на номер телефона — персональные данные в файле запрещены" });
  const parsed = SnapshotFile.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    issues.push({ level: "error", slug: FILE, msg: `файл не проходит схему: ${fmtZod(parsed.error)}` });
    return { issues, verdicts, file: null as TSnapshotFile | null };
  }
  const current = parsed.data;
  const seen = new Set<string>();
  for (const snapshot of current.snapshots) {
    if (seen.has(snapshot.slug)) issues.push({ level: "error", slug: snapshot.slug, msg: "модель встречается в файле дважды" });
    seen.add(snapshot.slug);
    const model = models.get(snapshot.slug);
    if (!model) {
      issues.push({ level: "error", slug: snapshot.slug, msg: "нет карточки модели в data/models — предложите её через newModels" });
      verdicts.set(snapshot.slug, "reject");
      continue;
    }
    const count = snapshot.listings?.length ?? 0;
    const seeded = !!current.seed && count < MIN_PUBLISH;
    const prevSnap = previous?.snapshots.find((item) => item.slug === snapshot.slug);
    const prev = prevSnap && (!previous?.seed || (prevSnap.listings?.length ?? 0) >= MIN_PUBLISH) ? prevSnap : undefined;
    validateSnapshot(issues, snapshot, model, prev, current.month, seeded);
    const hasError = issues.some((issue) => issue.level === "error" && issue.slug === snapshot.slug);
    verdicts.set(snapshot.slug, hasError ? "reject" : seeded ? "seed" : count < MIN_PUBLISH ? "fallback" : "publish");
  }
  for (const flag of current.flags) {
    if (flag.slug !== "*" && !models.has(flag.slug)) issues.push({ level: "warn", slug: flag.slug, msg: "флаг по модели, которой нет в каталоге" });
  }
  for (const slug of models.keys()) {
    if (!seen.has(slug) && !current.flags.some((flag) => flag.slug === slug)) {
      issues.push({ level: "warn", slug, msg: "нет ни снимка, ни флага — агент пропустил модель" });
    }
  }
  return { issues, verdicts, file: current };
}

function dataDir() {
  return process.env.RTR_DATA ?? path.join(process.cwd(), "data");
}

function loadModels(dir: string) {
  const map = new Map<string, TModel>();
  const issues: Issue[] = [];
  for (const file of fs.readdirSync(path.join(dir, "models")).filter((name) => name.endsWith(".json"))) {
    const parsed = Model.safeParse(JSON.parse(fs.readFileSync(path.join(dir, "models", file), "utf8")));
    if (!parsed.success) {
      issues.push({ level: "error", slug: file, msg: `карточка не проходит схему: ${fmtZod(parsed.error)}` });
      continue;
    }
    const model = parsed.data;
    if (`${model.slug}.json` !== file) issues.push({ level: "error", slug: model.slug, msg: `имя файла ${file} не совпадает со slug` });
    if (map.has(model.slug)) issues.push({ level: "error", slug: model.slug, msg: "дублирующийся slug" });
    const codes = new Set(model.engines.map((engine) => engine.code));
    for (const gearbox of model.gearboxes) {
      for (const code of gearbox.engineCodes ?? []) {
        if (!codes.has(code)) issues.push({ level: "error", slug: model.slug, msg: `коробка «${gearbox.name}» ссылается на неизвестный мотор ${code}` });
      }
    }
    if (!model.gearboxes.some((gearbox) => gearbox.type !== "MT" && gearbox.verdict !== "avoid")) {
      issues.push({ level: "warn", slug: model.slug, msg: "нет ни одной допустимой автоматической коробки — модель не попадёт в каталог" });
    }
    issues.push(...modelCardIssues(model));
    for (const risk of model.risks) {
      if (risk.repairCostRub && risk.repairCostRub[0] > risk.repairCostRub[1]) {
        issues.push({ level: "error", slug: model.slug, msg: `риск «${risk.title}»: стоимость ремонта «от» больше «до»` });
      }
    }
    map.set(model.slug, model);
  }
  return { map, issues };
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const monthArg = args.find((arg) => /^\d{4}-\d{2}$/.test(arg));
  const root = dataDir();
  const snapDir = path.join(root, "snapshots");
  const snapFiles = fs.readdirSync(snapDir).filter((file) => /^\d{4}-\d{2}\.json$/.test(file)).sort();
  const month = monthArg ?? snapFiles.at(-1)?.slice(0, 7);
  if (!month) {
    console.error("Нет файлов в data/snapshots");
    process.exit(1);
  }
  const file = `${month}.json`;
  if (!snapFiles.includes(file)) {
    console.error(`Нет файла data/snapshots/${file}`);
    process.exit(1);
  }

  const { map, issues: modelIssues } = loadModels(root);
  const raw = fs.readFileSync(path.join(snapDir, file), "utf8");
  const prevName = snapFiles.filter((name) => name < file).at(-1);
  const previous = prevName ? SnapshotFile.safeParse(JSON.parse(fs.readFileSync(path.join(snapDir, prevName), "utf8"))).data ?? null : null;
  const reviewed = reviewRaw(raw, map, previous);
  const issues = [...modelIssues, ...reviewed.issues];
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warn");
  const label = { publish: "публикуем", fallback: "прошлая цена", reject: "отклонено", seed: "стартовый ориентир" };
  const lines = [
    `## Проверка данных Road to Ride — ${month}`,
    `Моделей в каталоге: ${map.size}. Снимков: ${reviewed.file?.snapshots.length ?? 0}. Ошибок: ${errors.length}. Предупреждений: ${warnings.length}.`,
    "",
    "| Модель | Итог |",
    "|---|---|",
    ...[...reviewed.verdicts].map(([slug, verdict]) => `| ${slug} | ${label[verdict]} |`),
    "",
    "### Ошибки",
    ...(errors.length ? errors.map((issue) => `- **${issue.slug}**: ${issue.msg}`) : ["— нет"]),
    "",
    "### Предупреждения",
    ...(warnings.length ? warnings.map((issue) => `- ${issue.slug}: ${issue.msg}`) : ["— нет"]),
  ];
  const report = lines.join("\n");
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n");

  const fileErrors = errors.filter((issue) => issue.slug === FILE || issue.slug.endsWith(".json"));
  const rejected = [...reviewed.verdicts].filter(([, verdict]) => verdict === "reject").map(([slug]) => slug);
  if (write && reviewed.file && rejected.length && !fileErrors.length) {
    const out = {
      ...reviewed.file,
      snapshots: reviewed.file.snapshots.filter((snapshot) => !rejected.includes(snapshot.slug)),
      flags: [
        ...reviewed.file.flags,
        ...rejected.map((slug) => ({
          slug,
          issue: "Отклонено валидатором: " + errors.filter((issue) => issue.slug === slug).map((issue) => issue.msg).slice(0, 3).join("; "),
        })),
      ],
    };
    fs.writeFileSync(path.join(snapDir, file), JSON.stringify(out, null, 2) + "\n");
    console.log(`\nСохранено: ${rejected.length} моделей перенесены во flags. Запустите проверку ещё раз.`);
    process.exit(0);
  }
  process.exit(errors.length ? 1 : 0);
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entry) main();
