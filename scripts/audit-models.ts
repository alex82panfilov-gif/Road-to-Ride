#!/usr/bin/env tsx
/**
 * Аудит карточек перед сбором объявлений. Данные не меняет.
 *   npx tsx scripts/audit-models.ts
 * Пишет docs/data-audit-2026-10.md
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Model, type TModel } from "../lib/schema.ts";

const FORK_SLUGS = [
  "daewoo-matiz",
  "hyundai-elantra-xd",
  "nissan-almera-n16",
  "kia-cerato-1",
  "ford-fusion",
  "skoda-octavia-a5",
  "nissan-almera-g15",
  "volkswagen-polo-sedan",
];

type Row = {
  slug: string;
  engineCodes: "да" | "частично" | "нет";
  gearboxYears: "да" | "частично" | "нет";
  listingRules: "да" | "нет";
  combo: "да" | "нет";
  ready: "можно собирать" | "сначала правила";
};

function coverage(flags: boolean[]): "да" | "частично" | "нет" {
  if (flags.length === 0 || flags.every((flag) => !flag)) return "нет";
  if (flags.every(Boolean)) return "да";
  return "частично";
}

function rowOf(model: TModel): Row {
  const automatic = model.gearboxes.filter((gearbox) => gearbox.type !== "MT" && gearbox.verdict !== "avoid");
  const engineCodes = coverage(automatic.map((gearbox) => Boolean(gearbox.engineCodes?.length)));
  const gearboxYears = coverage(automatic.map((gearbox) => Boolean(gearbox.years)));
  const listingRules = model.listingRules?.length ? "да" : "нет";
  const combo = automatic.some((gearbox) => Boolean(gearbox.engineCodes?.length) && Boolean(gearbox.years)) ? "да" : "нет";
  const ready = engineCodes === "да" && listingRules === "да" ? "можно собирать" : "сначала правила";
  return { slug: model.slug, engineCodes, gearboxYears, listingRules, combo, ready };
}

function unnamedEngines(model: TModel): string | null {
  const codes = [
    ...new Set(
      model.gearboxes
        .filter((gearbox) => gearbox.type !== "MT" && gearbox.verdict !== "avoid")
        .flatMap((gearbox) => gearbox.engineCodes ?? []),
    ),
  ];
  if (!model.listingRules?.length || codes.length < 2) return null;
  const rules = model.listingRules.join(" ");
  const missing = codes.filter((code) => !rules.includes(code));
  if (!missing.length) return null;
  return `${model.slug}: в listingRules не названы коды ${missing.join(", ")}. Валидатор примет объявление с любым кодом этой коробки.`;
}

function table(rows: Row[]): string {
  const header = "| Модель | engineCodes у разрешённых коробок | годы у коробок | listingRules | мотор + год + коробка | Сбор |";
  const line = "|---|---|---|---|---|---|";
  const body = rows.map(
    (row) => `| ${row.slug} | ${row.engineCodes} | ${row.gearboxYears} | ${row.listingRules} | ${row.combo} | ${row.ready} |`,
  );
  return [header, line, ...body].join("\n");
}

const octaviaNote = `
## Skoda Octavia A5

В каталоге нет slug \`skoda-octavia-2\`. Поколение A5 — это \`skoda-octavia-a5\`. Сейчас у карточки два мотора без кодов MPI/TSI, у коробок нет \`engineCodes\` и лет, \`listingRules\` нет. Слово «автомат» в объявлении валидатор не отличит от DSG, если сборщик запишет тип AT.

Правила ниже — предложение, данные модели не менялись. Годы сверены по источникам, и источники друг с другом не во всём сходятся.

### Что сходится

- 1.6 MPI 102 л.с. (коды BGU, BSE, BSF, CCSA; у рестайлинга ещё CMXA) шёл с механикой и с 6-ступенчатым автоматом Aisin 09G. Это сочетание, которое можно разрешать. Источники: [каталог КПП VAG](https://vag.org.ru/articles/66-skoda-octavia-a5.html) для выпуска до октября 2008, [разбор коробок A5](https://octavia-a5.ru/obzor/akpp-skoda).
- 1.4 TSI (CAXA, с ноября 2008) в основном шёл с DSG. Его в выборку не брать: и мотор, и робот вне спокойного варианта. [Тот же разбор](https://octavia-a5.ru/obzor/akpp-skoda) прямо пишет DSG на 1.4 и 1.8 TSI.
- DSG DQ200 (сухое, 7 ступеней) и DSG DQ250 (мокрое, 6 ступеней, код 02E) — avoid, независимо от слова в объявлении.

### Где источники расходятся

Память «ранний 1.8 TSI шёл с тем же автоматом, позже с DSG» источниками не подтверждается.

- До октября 2008 1.8 TSI (BYJ, BZB, 160 л.с.) в каталоге VAG указан только с механикой 02S, без 09G: [vag.org.ru](https://vag.org.ru/articles/66-skoda-octavia-a5.html).
- [octavia-a5.ru](https://octavia-a5.ru/obzor/akpp-skoda) пишет Aisin с 1.8 TSI только в конце выпуска, осень 2012 — середина 2013, и то в усиленном варианте. Основная пара 1.8 — DSG.
- Сервисная статья [verticalauto.ru](https://verticalauto.ru/articles/skoda-octavia-s-avtomatom-aisin-09g-pravda-ob-obsluzivanii-resurse-i-remonte) наоборот ставит 09G и на 1.8 TSI, и на часть 1.4 TSI 2009–2013. Это не каталог запчастей, годы там не разделены.

Пока годы автомата на 1.8 не сошлись, в разрешённую выборку 1.8 TSI не класть. Если в объявлении прямо назван 09G или «гидроавтомат», а не просто «автомат», строку можно принести отдельно и пометить caution: мотор семейства EA888 (BZB, CDAA, CDAB) известен расходом масла и растяжением цепи. В карточке это уже риск «Расход масла на 1.8 TSI». Даже с автоматом это не тот же класс, что 1.6 MPI.

### Предлагаемые правила отбора

1. Разрешено: 1.6 MPI, 102 л.с., коды BGU / BSE / BSF / CCSA / CMXA, коробка только 6АКПП Aisin 09G, годы поколения 2004–2013.
2. 1.8 TSI: в общую медиану не включать. Отдельная пометка caution по мотору EA888. Автомат принимать только если объявление называет 09G, и год сверить руками: каталоги не дают одного окна.
3. 1.4 TSI и любой DSG — avoid, в listings не писать.
4. Объявление со словом «автомат» без мотора или без отличия 09G от DSG — не включать.
`;

export function reportText(models: TModel[]): string {
  const rows = models.map(rowOf).sort((a, b) => a.slug.localeCompare(b.slug, "ru"));
  const fork = rows.filter((row) => FORK_SLUGS.includes(row.slug));
  const ready = fork.filter((row) => row.ready === "можно собирать").map((row) => row.slug);
  const wait = fork.filter((row) => row.ready !== "можно собирать").map((row) => row.slug);
  const withCombo = rows.filter((row) => row.combo === "да").map((row) => row.slug);
  const comboSentence = withCombo.length
    ? `Сочетание мотор + год + коробка сейчас есть у: ${withCombo.join(", ")}.`
    : "Сочетания мотор + год + коробка нет ни у одной модели.";
  const forkCombo = fork.some((row) => row.combo === "да")
    ? ""
    : "У восьми моделей развилки такого сочетания нет: годы коробки там не заданы.";
  return [
    "# Аудит карточек перед сбором — 2026-10",
    "",
    "Скрипт `scripts/audit-models.ts` только читает `data/models`. Карточки не исправлялись.",
    "",
    "«Можно собирать» значит: у каждой разрешённой автоматической коробки есть `engineCodes` и у модели есть `listingRules`. Сочетание мотор + год + коробка есть только если у коробки заполнены и коды, и годы.",
    comboSentence,
    forkCombo,
    "",
    "## Восемь моделей развилки",
    "",
    table(fork),
    "",
    ready.length ? `Уже можно нести в таблицу: ${ready.join(", ")}.` : "Ни одну из восьми ещё нельзя собирать по правилам.",
    wait.length ? `Сначала дописать правила: ${wait.join(", ")}.` : "",
    ...models.filter((model) => FORK_SLUGS.includes(model.slug)).map(unnamedEngines).filter((line): line is string => Boolean(line)),
    "",
    "## Все модели",
    "",
    table(rows),
    "",
    octaviaNote.trim(),
    "",
  ].join("\n");
}

function loadModels(dir: string): TModel[] {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const parsed = Model.parse(JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")));
      return parsed;
    });
}

function main() {
  const root = path.join(process.cwd(), "data", "models");
  const text = reportText(loadModels(root));
  const out = path.join(process.cwd(), "docs", "data-audit-2026-10.md");
  fs.writeFileSync(out, text);
  console.log(text);
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entry) main();
