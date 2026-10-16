"use client";

import { useUser } from "@/components/providers";
import { todayIso } from "@/lib/format";
import { experienceYearsOn } from "@/lib/meta";

export function LicenseField() {
  const { data, update } = useUser();
  const dated = data.licenseDate !== null;

  function setRecent() {
    update((current) => ({
      ...current,
      licenseDate: null,
      driver: { ...current.driver, experienceYears: 0 },
    }));
  }

  function setDate(value: string) {
    update((current) => ({
      ...current,
      licenseDate: value || null,
      driver: { ...current.driver, experienceYears: value ? experienceYearsOn(value, todayIso(), 0) : 0 },
    }));
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        Когда получил права?
        <select
          className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4"
          value={dated ? "date" : "recent"}
          onChange={(event) => {
            if (event.target.value === "recent") setRecent();
            else setDate(data.licenseDate ?? todayIso());
          }}
        >
          <option value="recent">Меньше года назад</option>
          <option value="date">Указать дату</option>
        </select>
      </label>
      {dated ? (
        <label className="block text-sm">
          Дата получения прав
          <input
            type="date"
            required
            value={data.licenseDate ?? ""}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4"
          />
        </label>
      ) : (
        <p className="text-sm text-muted">По умолчанию стаж меньше года. К дате покупки он вырастет, и полис посчитается уже с ним.</p>
      )}
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={data.onParentPolicy}
          onChange={(event) => update((current) => ({ ...current, onParentPolicy: event.target.checked }))}
        />
        <span>Вписан в полис родителей, без аварий</span>
      </label>
      <p className="text-sm text-muted">Без галочки КБМ остаётся начальным. С галочкой класс растёт на один за каждый полный год без аварий.</p>
    </div>
  );
}
