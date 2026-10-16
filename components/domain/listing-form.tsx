"use client";

import { Card } from "@/components/ui/card";
import { SearchLinks } from "@/components/domain/search-links";
import { assessListing, type ListingMarket } from "@/lib/listing";
import type { Model } from "@/lib/schema";
import { autoruSearchUrl, dromSearchUrl, similarWindow } from "@/lib/view/search-links";
import { meta } from "@/lib/meta";
import { useState } from "react";

export function ListingForm({ model, price }: { model: Model; price: ListingMarket }) {
  const [year, setYear] = useState(String(model.years[1]));
  const [mileage, setMileage] = useState("");
  const [cost, setCost] = useState("");
  const [owners, setOwners] = useState("2");
  const [flags, setFlags] = useState<ReturnType<typeof assessListing> | null>(null);
  const similar = similarWindow(Number(year) || model.years[1], Number(mileage) || 0);

  return (
    <Card>
      <h2 className="text-lg font-semibold">Проверить объявление</h2>
      <p className="mt-2 text-sm text-muted">Введите цифры из объявления. Сайт сравнит их с нормами модели и не сохранит их на сервере.</p>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setFlags(
            assessListing(
              model,
              price,
              { year: Number(year), mileageKm: Number(mileage), priceRub: Number(cost), owners: Number(owners) },
              Number(meta.updatedAt.slice(0, 4)),
            ),
          );
        }}
      >
        <Field label="Год" value={year} onChange={setYear} />
        <Field label="Пробег, км" value={mileage} onChange={setMileage} />
        <Field label="Цена, ₽" value={cost} onChange={setCost} />
        <Field label="Владельцев" value={owners} onChange={setOwners} />
        <button type="submit" className="h-12 rounded-full bg-accent font-medium text-accent-ink sm:col-span-2">
          Сравнить с нормами
        </button>
      </form>
      <div className="mt-4">
        <SearchLinks
          autoLabel="Сравнить с похожими на auto.ru"
          dromLabel="на Drom"
          autoHref={autoruSearchUrl(model, similar)}
          dromHref={dromSearchUrl(model, similar)}
        />
      </div>
      {flags ? (
        <ul className="mt-4 space-y-2 text-sm">
          {flags.map((flag) => (
            <li key={flag.text} className={flag.tone === "bad" ? "text-danger" : flag.tone === "warn" ? "text-warning" : "text-success"}>
              {flag.text}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm">
      {label}
      <input inputMode="numeric" required value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4" />
    </label>
  );
}
