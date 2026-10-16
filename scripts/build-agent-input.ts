import fs from "node:fs";
import { loadModels, loadSnapshot, prevMonth } from "../lib/data.ts";

const month = process.argv[2] ?? new Date().toISOString().slice(0, 7);
const today = new Date().toISOString().slice(0, 10);
const models = loadModels().map((model) => ({
  slug: model.slug,
  brand: model.brand,
  model: model.model,
  generation: model.generation,
  years: model.years,
  engines: model.engines.map((engine) => ({ code: engine.code, volumeL: engine.volumeL, hp: engine.hp })),
  allowedGearboxes: model.gearboxes
    .filter((gearbox) => gearbox.type !== "MT" && gearbox.verdict !== "avoid")
    .map((gearbox) => ({ type: gearbox.type, name: gearbox.name, engineCodes: gearbox.engineCodes, years: gearbox.years })),
  avoidGearboxes: model.gearboxes.filter((gearbox) => gearbox.verdict === "avoid").map((gearbox) => gearbox.name),
  listingRules: model.listingRules ?? [],
}));

const prompt = fs
  .readFileSync("docs/AGENT_PROMPT.md", "utf8")
  .replaceAll("{{YYYY-MM}}", month)
  .replaceAll("{{TODAY}}", today)
  .replace("{{MODELS}}", JSON.stringify(models, null, 2))
  .replace("{{PREV_SNAPSHOT}}", JSON.stringify(loadSnapshot(prevMonth(month)) ?? [], null, 2));

if (/\{\{.+?\}\}/.test(prompt)) throw new Error("Остались незаполненные подстановки");
fs.writeFileSync(`docs/agent-input-${month}.md`, prompt);
console.log(`docs/agent-input-${month}.md`);
