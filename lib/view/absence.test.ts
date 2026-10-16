import assert from "node:assert/strict";
import test from "node:test";
import { absenceDue, absenceLines, type AbsenceInput } from "./absence.ts";

const base: AbsenceInput = {
  lastSeenAt: "2026-09-01",
  saved: 300_000,
  deposits: [],
  tiers: [150_000, 200_000, 350_000],
  market: [],
  beforeName: null,
  afterName: null,
  goalName: null,
  monthsBefore: null,
  monthsAfter: null,
};

test("a visit sooner than 14 days does not open the card", () => {
  assert.equal(absenceDue(null, "2026-10-16"), false);
  assert.equal(absenceDue("2026-10-03", "2026-10-16"), false);
  assert.equal(absenceDue("2026-10-02", "2026-10-16"), true);
});

test("seed prices and a 2 percent move produce no market line", () => {
  const seed = absenceLines({
    ...base,
    market: [{ name: "Cerato", seed: true, previous: 400_000, current: 360_000, month: "2026-11", listings: 12 }],
  });
  assert.equal(seed.some((line) => line.startsWith("Медиана")), false);

  const tiny = absenceLines({
    ...base,
    market: [{ name: "Cerato", seed: false, previous: 400_000, current: 408_000, month: "2026-11", listings: 12 }],
  });
  assert.equal(tiny.some((line) => line.startsWith("Медиана")), false);

  const real = absenceLines({
    ...base,
    market: [{ name: "Cerato", seed: false, previous: 400_000, current: 384_000, month: "2026-11", listings: 12 }],
  });
  assert.equal(real[0], "Медиана Cerato −4% (снимок 2026-11, 12 объявлений)");
});

test("money, a passed post and a new today car fit in three lines", () => {
  const lines = absenceLines({
    ...base,
    saved: 360_000,
    deposits: [
      { amount: 20_000, date: "2026-09-10" },
      { amount: 20_000, date: "2026-09-20" },
    ],
    beforeName: "Hyundai Elantra",
    afterName: "Kia Cerato",
  });
  assert.equal(lines.length, 2);
  assert.equal(lines[0].replace(/\s/g, " "), "+40 000 ₽ за 2 взноса, пройден столб 350 000");
  assert.equal(lines[1], "Сегодня теперь Kia Cerato вместо Hyundai Elantra");
});

test("nothing to say means no card", () => {
  assert.deepEqual(absenceLines(base), []);
});
