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

export function assessListing(model: Model, price: Pick<PriceSnapshot, "p25" | "p75" | "median">, input: ListingInput, asOfYear: number): ListingFlag[] {
  const flags: ListingFlag[] = [];
  const [yearFrom, yearTo] = model.years;
  if (input.year < yearFrom || input.year > yearTo) {
    flags.push({ tone: "bad", text: `Год ${input.year} вне этого поколения (${yearFrom}–${yearTo}).` });
  }

  const age = Math.max(1, asOfYear - input.year);
  if (input.mileageKm < age * 5_000 && age >= 6) {
    flags.push({
      tone: "warn",
      text: `Пробег подозрительно мал для ${input.year} года: около ${Math.round(input.mileageKm / age / 1000)} тыс. км в год.`,
    });
  } else if (input.mileageKm >= model.mileage.avoidFrom) {
    flags.push({ tone: "bad", text: "Пробег выше порога, после которого эту модель лучше не рассматривать." });
  } else if (input.mileageKm > model.mileage.okMax) {
    flags.push({ tone: "warn", text: "Пробег уже высокий: заложите ремонт сверх цены в объявлении." });
  } else if (input.mileageKm <= model.mileage.goodMax) {
    flags.push({ tone: "ok", text: "Пробег в хорошем диапазоне для этой модели." });
  } else {
    flags.push({ tone: "ok", text: "Пробег обычный для возраста. Смотрите обслуживание, а не одну цифру." });
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
