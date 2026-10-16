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

export function assessListing(model: Model, price: Pick<PriceSnapshot, "p25" | "p75" | "median">, input: ListingInput, asOfYear: number): ListingFlag[] {
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

  if (price.p25 > 0 && input.priceRub < price.p25 * 0.75) {
    flags.push({ tone: "bad", text: "Цена заметно ниже типичного диапазона. Так часто выглядит приманка." });
  } else if (price.p75 > 0 && input.priceRub > price.p75 * 1.2) {
    flags.push({ tone: "warn", text: "Цена выше типичного диапазона. Имеет смысл сравнить с другими объявлениями." });
  } else if (price.median > 0) {
    flags.push({ tone: "ok", text: "Цена рядом с ориентиром по модели." });
  }

  if (input.owners >= 6) flags.push({ tone: "warn", text: "Много собственников: спросите, почему машина так часто переходила." });
  else if (input.owners >= 1 && input.owners <= 3) flags.push({ tone: "ok", text: "Число владельцев само по себе не настораживает." });

  return flags;
}
