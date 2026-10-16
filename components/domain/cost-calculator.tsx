"use client";

import { LicenseField } from "@/components/domain/license-field";
import { useUser } from "@/components/providers";
import { Card } from "@/components/ui/card";
import { annualOwnership, experiencePurchaseLine, purchaseQuote, transportTaxRub, type DriverProfile } from "@/lib/meta";
import { meta } from "@/lib/meta";
import { rub, todayIso } from "@/lib/format";
import { inflationOf } from "@/lib/storage";
import { displayName, type CatalogItem } from "@/lib/market";
import { useEffect, useMemo, useState } from "react";

export function CostCalculator({ item, others }: { item: CatalogItem; others: CatalogItem[] }) {
  const { data, saved, update } = useUser();
  const [kmPerMonth, setKm] = useState(meta.kmPerMonthDefault);
  const [fuelPrice, setFuel] = useState(meta.fuelPriceRub);
  const [otherSlug, setOtherSlug] = useState("");
  const [asOf, setAsOf] = useState("");
  const driver = data.driver;
  useEffect(() => {
    setAsOf(todayIso());
  }, []);
  const purchase = purchaseQuote({
    median: item.median,
    hp: item.hp,
    driver,
    licenseDate: data.licenseDate,
    saved,
    monthly: data.monthly,
    inflation: inflationOf(data),
    asOf,
  });
  const year = useMemo(
    () => annualOwnership({ hp: item.hp, fuelLPer100: item.fuelLPer100, kmPerMonth, fuelPriceRub: fuelPrice, driver }),
    [item, kmPerMonth, fuelPrice, driver],
  );
  const other = others.find((candidate) => candidate.slug === otherSlug) ?? null;
  const otherYear = other
    ? annualOwnership({ hp: other.hp, fuelLPer100: other.fuelLPer100, kmPerMonth, fuelPriceRub: fuelPrice, driver })
    : null;

  function setDriver(patch: Partial<DriverProfile>) {
    update((current) => ({ ...current, driver: { ...current.driver, ...patch } }));
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[2rem] leading-tight font-semibold">Год с {displayName(item)}</h1>
        <p className="mt-2 text-sm text-muted">Цена покупки — не вся сумма. Ниже год владения для вашего возраста и стажа.</p>
      </header>
      <Card className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Возраст" value={driver.age} onChange={(age) => setDriver({ age })} />
        <div className="sm:col-span-2">
          <LicenseField />
        </div>
        <NumberField label="Километров в месяц" value={kmPerMonth} onChange={setKm} />
        <NumberField label="Цена топлива, ₽/л" value={fuelPrice} onChange={setFuel} />
      </Card>
      <Card>
        <p className="text-sm text-muted">К покупке, с резервом</p>
        <p className="num text-3xl font-semibold">{rub(purchase.total)}</p>
        <p className="mt-2 text-sm text-muted">{experiencePurchaseLine(purchase.experienceYears)}</p>
        <ul className="mt-4 space-y-1 text-sm">
          <li>ОСАГО: {rub(year.osago)}</li>
          <li>Налог: {rub(year.tax)} ({transportTaxRub(item.hp) === year.tax ? `${item.hp} л.с.` : ""})</li>
          <li>ТО: {rub(year.service)}</li>
          <li>Топливо: {rub(year.fuel)}</li>
        </ul>
        <p className="num mt-4 text-xl font-semibold">Год владения {rub(year.total)}</p>
      </Card>
      <Card>
        <label className="text-sm">
          Сравнить год владения с
          <select className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4" value={otherSlug} onChange={(event) => setOtherSlug(event.target.value)}>
            <option value="">Не сравнивать</option>
            {others.filter((candidate) => candidate.slug !== item.slug).map((candidate) => (
              <option key={candidate.slug} value={candidate.slug}>
                {displayName(candidate)}
              </option>
            ))}
          </select>
        </label>
        {other && otherYear ? (
          <p className="mt-4 text-sm">
            {displayName(item)} в покупке {item.median < other.median ? "дешевле" : "дороже"}, а год владения — {rub(year.total)} против {rub(otherYear.total)} у {displayName(other)}.
          </p>
        ) : null}
      </Card>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="text-sm">
      {label}
      <input inputMode="decimal" className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4" value={value} onChange={(event) => onChange(Number(event.target.value) || 0)} />
    </label>
  );
}
