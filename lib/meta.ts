import metaJson from "@/data/meta.json";

export type DriverProfile = {
  age: number;
  experienceYears: number;
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

/** Упрощённый коэффициент возраст/стаж. Это не сетка ЦБ, а понятная вилка для калькулятора. */
export function ageExperienceCoef(age: number, experienceYears: number): number {
  const experience = Math.max(0, experienceYears);
  if (age < 22 && experience < 1) return 2.27;
  if (age < 22) return 1.97;
  if (age < 25 && experience < 2) return 1.87;
  if (age < 30 && experience < 3) return 1.63;
  if (experience < 2) return 1.46;
  if (age >= 30 && experience >= 10) return 1;
  return 1.2;
}

export function osagoRange(hp: number, driver: DriverProfile = DEFAULT_DRIVER): { min: number; max: number; mid: number } {
  const power = powerCoef(hp);
  const age = ageExperienceCoef(driver.age, driver.experienceYears);
  const kbm = driver.experienceYears < 1 ? meta.osago.kbmNewDriver : 1;
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
