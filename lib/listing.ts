import type { Model, PriceSnapshot } from "./schema";

export type ListingInput = {
  year: number;
  mileageKm: number;
  priceRub: number;
  owners: number;
};

export type ListingFlag = {
  tone: "ok" | "warn" | "bad";
  text: string;
};

export type ListingMarket = Pick<PriceSnapshot, "p25" | "p75" | "median"> & { isSeed?: boolean };

function percentText(delta: number): string {
  const rounded = Math.round(Math.abs(delta) * 1000) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
}

function againstPoint(asked: number, base: number, seed: boolean): ListingFlag {
  const delta = asked / base - 1;
  const where = seed ? "стартового ориентира" : "ориентира";
  if (delta < -0.25) return { tone: "bad", text: "Подозрительно дёшево: залог, битая или мошенник." };
  if (delta < -0.15) return { tone: "warn", text: `Ниже ${where}, на ${percentText(delta)}%.` };
  if (delta <= 0.15) return { tone: "ok", text: seed ? "Рядом со стартовым ориентиром." : "Рядом с ориентиром." };
  if (delta <= 0.4) return { tone: "warn", text: `Выше ${where}, на ${percentText(delta)}%.` };
  return { tone: "warn", text: `Заметно выше ${where}, на ${percentText(delta)}%.` };
}

function againstBand(asked: number, p25: number, p75: number): ListingFlag {
  if (asked < p25 * 0.75) return { tone: "bad", text: "Подозрительно дёшево: залог, битая или мошенник." };
  if (asked < p25 * 0.85) return { tone: "warn", text: `Ниже рынка, на ${percentText(asked / p25 - 1)}% от нижней границы.` };
  if (asked <= p75 * 1.15) return { tone: "ok", text: "Рядом с рынком." };
  if (asked <= p75 * 1.4) return { tone: "warn", text: `Выше рынка, на ${percentText(asked / p75 - 1)}% от верхней границы.` };
  return { tone: "warn", text: `Заметно выше рынка, на ${percentText(asked / p75 - 1)}% от верхней границы.` };
}

const KM_PER_YEAR = 15_000;
const TAXI_KM_PER_YEAR = 30_000;

function yearsAfter(age: number, one: string, few: string, many: string): string {
  const mod100 = age % 100;
  const mod10 = age % 10;
  if (mod100 > 10 && mod100 < 20) return `${age} ${many}`;
  if (mod10 === 1) return `${age} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${age} ${few}`;
  return `${age} ${many}`;
}

const SELLER_FAULTS = ["не греет", "требует ремонта", "стук", "пинается", "не заводится", "под восстановление", "срочно"];

export function admittedFault(text: string, condition: string): string | null {
  if (condition !== "Не требует ремонта") return null;
  const hay = text.toLowerCase();
  if (!SELLER_FAULTS.some((word) => hay.includes(word))) return null;
  return "Продавец сам указал неисправность.";
}

export function assessListing(model: Model, price: ListingMarket, input: ListingInput, asOfYear: number): ListingFlag[] {
  const flags: ListingFlag[] = [];
  const [yearFrom, yearTo] = model.years;
  if (input.year < yearFrom || input.year > yearTo) {
    flags.push({ tone: "bad", text: `Год ${input.year} вне этого поколения (${yearFrom}–${yearTo}).` });
  }

  const age = Math.max(1, asOfYear - input.year);
  const expected = age * KM_PER_YEAR;
  const ratio = input.mileageKm / expected;
  const perYear = input.mileageKm / age;
  const overLimit = input.mileageKm >= model.mileage.avoidFrom;
  if (overLimit) flags.push({ tone: "bad", text: "Не рассматривать: пробег выше порога этой модели." });
  if (age >= 8 && ratio < 0.5) {
    let text = `Подозрительно мало для ${yearsAfter(age, "года", "лет", "лет")}. Проверьте историю пробега в отчёте по VIN.`;
    if (input.owners >= 4) text += " Каждая смена владельца — повод для скрутки. Сверьте 9 отметок о пробеге.";
    flags.push({ tone: "warn", text });
  } else if (ratio > 1.3 || perYear > TAXI_KM_PER_YEAR) {
    flags.push({ tone: "warn", text: "Похоже на такси или каршеринг." });
  } else if (!overLimit) {
    flags.push({ tone: "ok", text: "Обычный для возраста." });
  }
  if (age >= 15) {
    flags.push({
      tone: "warn",
      text: `Возраст важнее пробега: машине ${yearsAfter(age, "год", "года", "лет")}. Резина, сальники, проводка и печка стареют независимо от пробега.`,
    });
  }

  if (price.isSeed) {
    if (price.median > 0) flags.push(againstPoint(input.priceRub, price.median, true));
    flags.push({ tone: "warn", text: "Ориентир стартовый, не замер рынка." });
  } else if (price.p25 > 0 && price.p75 > 0) {
    flags.push(againstBand(input.priceRub, price.p25, price.p75));
  }

  if (input.owners >= 6) flags.push({ tone: "warn", text: "Много собственников: спросите, почему машина так часто переходила." });
  else if (input.owners >= 1 && input.owners <= 3) flags.push({ tone: "ok", text: "Число владельцев само по себе не настораживает." });

  return flags;
}
