"use client";

import { Card } from "@/components/ui/card";
import { SearchLinks } from "@/components/domain/search-links";
import { admittedFault, assessListing, type ListingMarket } from "@/lib/listing";
import type { Model } from "@/lib/schema";
import { searchLinks } from "@/lib/view/search";
import { meta } from "@/lib/meta";
import { useState } from "react";

export function ListingForm({ model, price }: { model: Model; price: ListingMarket }) {
  const [year, setYear] = useState(String(model.years[1]));
  const [mileage, setMileage] = useState("");
  const [cost, setCost] = useState("");
  const [owners, setOwners] = useState("2");
  const [condition, setCondition] = useState("Не требует ремонта");
  const [adText, setAdText] = useState("");
  const [flags, setFlags] = useState<ReturnType<typeof assessListing> | null>(null);
  const similar = searchLinks(model, {
    median: price.median,
    p25: price.p25,
    p75: price.p75,
    isSeed: price.isSeed,
    similar: { year: Number(year) || model.years[1], mileageKm: Number(mileage) || 0 },
  });

  return (
    <Card>
      <h2 className="text-lg font-semibold">Проверить объявление</h2>
      <p className="mt-2 text-sm text-muted">Введите цифры из объявления. Сайт сравнит их с нормами модели и не сохранит их на сервере.</p>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const digits = (value: string) => Number(value.replace(/\s/g, ""));
          const next = assessListing(
            model,
            price,
            { year: digits(year), mileageKm: digits(mileage), priceRub: digits(cost), owners: digits(owners) },
            Number(meta.updatedAt.slice(0, 4)),
          );
          const fault = admittedFault(adText, condition);
          setFlags(fault ? [...next, { tone: "warn", text: fault }] : next);
        }}
      >
        <Field label="Год" value={year} onChange={setYear} />
        <Field label="Пробег, км" value={mileage} onChange={setMileage} />
        <Field label="Цена, ₽" value={cost} onChange={setCost} />
        <Field label="Владельцев" value={owners} onChange={setOwners} />
        <label className="text-sm sm:col-span-2">
          Состояние в объявлении
          <select value={condition} onChange={(event) => setCondition(event.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4">
            <option>Не требует ремонта</option>
            <option>Есть неисправности</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Текст объявления, необязательно
          <textarea value={adText} onChange={(event) => setAdText(event.target.value)} className="mt-1 min-h-24 w-full rounded-2xl bg-canvas-secondary px-4 py-3" />
          <span className="mt-1 block text-muted">Текст остаётся только в этой вкладке и никуда не записывается.</span>
        </label>
        <button type="submit" className="h-12 rounded-full bg-accent font-medium text-accent-ink sm:col-span-2">
          Сравнить с нормами
        </button>
      </form>
      <div className="mt-4">
        <SearchLinks
          autoLabel="Сравнить с похожими на auto.ru"
          dromLabel="на Drom"
          autoHref={similar.links.autoru}
          dromHref={similar.links.drom}
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
