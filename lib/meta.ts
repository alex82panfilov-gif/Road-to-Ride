import metaJson from "@/data/meta.json";
import { monthsToGoal } from "./forecast";
import { plural } from "./format";

export type DriverProfile = {
  age: number;
  experienceYears: number;
  /** Вписан в чужой полис и ездит без аварий. Класс КБМ тогда растёт от начального. */
  onParentPolicy?: boolean;
};

export type Meta = {
  updatedAt: string;
  regionLabel: string;
  monthlyInflation: number;
  reserveRate: number;
  registrationRub: number;
  diagnosticCardRub: number;
  firstServiceRub: number;
  annualServiceRub: number;
  fuelPriceRub: number;
  kmPerMonthDefault: number;
  feedbackEmail: string;
  githubIssuesUrl: string;
  sweetSpots: number[];
  disclaimer: string;
  osago: {
    tbMin: number;
    tbMax: number;
    territoryMoscow: number;
    kbmNewDriver: number;
    kbmInitialClass: number;
    kbmClasses: { class: string; coef: number }[];
    kbmSourceTitle: string;
    kbmSourceUrl: string;
    sourceTitle: string;
    sourceUrl: string;
    note: string;
  };
  powerCoef: { upToHp: number; coef: number }[];
  transportTax: { upToHp: number; rubPerHp: number }[];
  sources: { title: string; url: string }[];
};

export const meta = metaJson as Meta;

export const DEFAULT_DRIVER: DriverProfile = { age: 20, experienceYears: 0 };

export function powerCoef(hp: number): number {
  const row = meta.powerCoef.find((item) => hp <= item.upToHp);
  return row?.coef ?? meta.powerCoef[meta.powerCoef.length - 1].coef;
}

/** Упрощённый коэффициент возраст/стаж. Клетки 18–21 и стажа до двух лет совпадают с указанием № 7204-У. */
export function ageExperienceCoef(age: number, experienceYears: number): number {
  const experience = Math.max(0, experienceYears);
  if (age < 22 && experience < 1) return 2.27;
  if (age < 22 && experience < 2) return 1.92;
  if (age < 22) return 1.97;
  if (age < 25 && experience < 2) return 1.87;
  if (age < 30 && experience < 3) return 1.63;
  if (experience < 2) return 1.46;
  if (age >= 30 && experience >= 10) return 1;
  return 1.2;
}

/** Стаж в годах: от даты прав до `asOf`, плюс месяцы до покупки. Пустая дата — прав меньше года. */
export function experienceYearsOn(licenseDate: string | null, asOfIso: string, extraMonths = 0): number {
  let months = 0;
  if (licenseDate && /^\d{4}-\d{2}-\d{2}$/.test(licenseDate) && /^\d{4}-\d{2}-\d{2}$/.test(asOfIso)) {
    const [year, month, day] = licenseDate.split("-").map(Number);
    const [asOfYear, asOfMonth, asOfDay] = asOfIso.split("-").map(Number);
    months = (asOfYear - year) * 12 + (asOfMonth - month);
    if (asOfDay < day) months -= 1;
    months = Math.max(0, months);
  }
  return (months + Math.max(0, extraMonths)) / 12;
}

export function experiencePurchaseLine(years: number): string {
  const rounded = Math.round(years * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
  const unit = Number.isInteger(rounded) ? plural(rounded, "год", "года", "лет") : "лет";
  return `ОСАГО посчитано на дату покупки: стаж к тому времени ${text} ${unit}.`;
}

export type PurchaseQuote = {
  total: number;
  osago: number;
  months: number | null;
  experienceYears: number;
  age: number;
};

/** Класс КБМ на дату: без полиса остаётся начальным, с полисом +1 за каждый полный безаварийный год. */
export function kbmClassAt(experienceYears: number, onParentPolicy: boolean): number {
  if (!onParentPolicy) return meta.osago.kbmInitialClass;
  return Math.min(13, meta.osago.kbmInitialClass + Math.floor(Math.max(0, experienceYears)));
}

export function kbmCoef(experienceYears: number, onParentPolicy: boolean): number {
  const initial = meta.osago.kbmClasses.find((row) => row.class === String(meta.osago.kbmInitialClass))?.coef ?? meta.osago.kbmNewDriver;
  const row = meta.osago.kbmClasses.find((item) => item.class === String(kbmClassAt(experienceYears, onParentPolicy)));
  return row?.coef ?? initial;
}

/** Цена к покупке и стаж на эту дату. КВС и, если отмечен полис родителей, КБМ смотрят на дату покупки. */
export function purchaseQuote(input: {
  median: number;
  hp: number;
  driver: DriverProfile;
  licenseDate: string | null;
  onParentPolicy: boolean;
  saved: number;
  monthly: number;
  inflation: number;
  asOf: string;
}): PurchaseQuote {
  const currentExperience = input.licenseDate
    ? experienceYearsOn(input.licenseDate, input.asOf, 0)
    : input.driver.experienceYears;
  const priceAt = (assumed: number): PurchaseQuote => {
    const experienceYears = currentExperience + assumed / 12;
    const age = input.driver.age + assumed / 12;
    const osago = osagoRange(input.hp, { age, experienceYears, onParentPolicy: input.onParentPolicy }).mid;
    const reserve = Math.round(input.median * meta.reserveRate);
    const total =
      input.median + osago + meta.registrationRub + meta.diagnosticCardRub + meta.firstServiceRub + reserve;
    const next =
      input.monthly > 0 || input.saved >= total
        ? monthsToGoal(input.saved, input.monthly, total, input.inflation)
        : null;
    return { total, osago, months: next, experienceYears, age };
  };
  let assumed = 0;
  const seen = new Set<number>();
  let quote = priceAt(0);
  for (let step = 0; step < 5; step += 1) {
    if (quote.months === null || quote.months === assumed) return quote;
    if (seen.has(quote.months)) {
      const longer = Math.max(assumed, quote.months);
      const priced = priceAt(longer);
      if (priced.months !== null && priced.months <= longer) return { ...priced, months: longer };
      return priced;
    }
    seen.add(assumed);
    assumed = quote.months;
    quote = priceAt(assumed);
  }
  return quote;
}

export function osagoRange(hp: number, driver: DriverProfile = DEFAULT_DRIVER): { min: number; max: number; mid: number } {
  const power = powerCoef(hp);
  const age = ageExperienceCoef(driver.age, driver.experienceYears);
  const kbm = kbmCoef(driver.experienceYears, driver.onParentPolicy === true);
  const factor = power * meta.osago.territoryMoscow * kbm * age;
  const min = Math.round(meta.osago.tbMin * factor);
  const max = Math.round(meta.osago.tbMax * factor);
  return { min, max, mid: Math.round((min + max) / 2) };
}

export function transportTaxRub(hp: number): number {
  const row = meta.transportTax.find((item) => hp <= item.upToHp) ?? meta.transportTax[meta.transportTax.length - 1];
  return Math.round(hp * row.rubPerHp);
}

export function realPrice(median: number, hp: number, driver: DriverProfile = DEFAULT_DRIVER): number {
  const osago = osagoRange(hp, driver).mid;
  const reserve = Math.round(median * meta.reserveRate);
  return median + osago + meta.registrationRub + meta.diagnosticCardRub + meta.firstServiceRub + reserve;
}

export function annualOwnership(input: {
  hp: number;
  fuelLPer100: number;
  kmPerMonth: number;
  fuelPriceRub: number;
  driver: DriverProfile;
}): { osago: number; tax: number; service: number; fuel: number; total: number } {
  const osago = osagoRange(input.hp, input.driver).mid;
  const tax = transportTaxRub(input.hp);
  const service = meta.annualServiceRub;
  const fuel = Math.round(((input.kmPerMonth * 12) / 100) * input.fuelLPer100 * input.fuelPriceRub);
  return { osago, tax, service, fuel, total: osago + tax + service + fuel };
}
