"use client";

import { LicenseField } from "@/components/domain/license-field";
import { useUi, useUser } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { labels } from "@/lib/content";
import { plural, rub, todayIso } from "@/lib/format";
import { purchaseQuote } from "@/lib/meta";
import { displayName, type CatalogItem } from "@/lib/market";
import { backupFilename, buildIcs, exportPayload, inflationOf, parseImport, type ContributorId } from "@/lib/storage";
import { useEffect, useMemo, useState } from "react";

export function SavingsPanel({ items }: { items: CatalogItem[] }) {
  const { ready, data, saved, update, removeDeposit, replaceAll } = useUser();
  const { setDepositOpen } = useUi();
  const [confirm, setConfirm] = useState(false);
  const [month, setMonth] = useState<string | null>(null);

  useEffect(() => {
    setMonth(todayIso().slice(0, 7));
  }, []);

  const shares = useMemo(() => {
    const totals = new Map<ContributorId, number>();
    for (const deposit of data.deposits) totals.set(deposit.by, (totals.get(deposit.by) ?? 0) + deposit.amount);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [data.deposits]);

  if (!ready) return <Skeleton className="h-64" />;

  const goal = items.find((item) => item.slug === data.goalSlug) ?? null;
  const goalQuote = goal
    ? purchaseQuote({
        median: goal.median,
        hp: goal.hp,
        driver: data.driver,
        licenseDate: data.licenseDate,
        onParentPolicy: data.onParentPolicy,
        saved,
        monthly: data.monthly,
        inflation: inflationOf(data),
        asOf: todayIso(),
      })
    : null;
  const goalPrice = goalQuote?.total ?? null;
  const months = goalQuote?.months ?? null;

  function download(filename: string, content: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (data.deposits.length === 0) {
    return (
      <Card className="space-y-4">
        <h1 className="text-[2rem] leading-tight font-semibold">Копилка</h1>
        <p>Здесь начнётся история вашей первой машины.</p>
        <p>
          {goal ? `Цель: ${displayName(goal)}.` : "Цель не выбрана."}{" "}
          <button type="button" className="font-medium" onClick={() => document.getElementById("savings-goal")?.focus()}>
            Выбрать
          </button>
        </p>
        <label className="block text-sm">
          Машина-цель
          <select
            id="savings-goal"
            className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4"
            value={data.goalSlug ?? ""}
            onChange={(event) => update((current) => ({ ...current, goalSlug: event.target.value || null }))}
          >
            <option value="">Не выбрана</option>
            {items.map((item) => (
              <option key={item.slug} value={item.slug}>
                {displayName(item)}
              </option>
            ))}
          </select>
        </label>
        <LicenseField />
        <Button onClick={() => setDepositOpen(true)}>Добавить первый взнос</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[2rem] leading-tight font-semibold">Копилка</h1>
          <p className="num mt-2 text-3xl font-semibold">{rub(saved)}</p>
        </div>
        <Button onClick={() => setDepositOpen(true)}>Добавить взнос</Button>
      </header>

      {month && data.backupReminderMonth !== month ? (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">Сохраните копию копилки. В браузере она может пропасть после очистки.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => download(backupFilename(todayIso()), JSON.stringify(exportPayload(data), null, 2), "application/json")}>
              Экспортировать
            </Button>
            <Button variant="ghost" onClick={() => update((current) => ({ ...current, backupReminderMonth: month }))}>
              Позже
            </Button>
          </div>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold">Кто сколько вложил</h2>
        <ul className="mt-4 space-y-3">
          {shares.map(([id, amount]) => (
            <li key={id}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{labels.contributors[id]}</span>
                <span className="num">{rub(amount)}</span>
              </div>
              <div className="h-2 rounded-full bg-canvas-secondary">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${(amount / saved) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-4">
        <label className="block text-sm">
          Машина-цель
          <select
            className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4"
            value={data.goalSlug ?? ""}
            onChange={(event) => update((current) => ({ ...current, goalSlug: event.target.value || null }))}
          >
            <option value="">Не выбрана</option>
            {items.map((item) => (
              <option key={item.slug} value={item.slug}>
                {displayName(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Откладываю в месяц, ₽
          <input
            inputMode="numeric"
            className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4"
            value={data.monthly || ""}
            onChange={(event) => update((current) => ({ ...current, monthly: Math.max(0, Number(event.target.value) || 0) }))}
          />
        </label>
        <LicenseField />
        <label className="block text-sm">
          Рост цен в месяц, %
          <input
            inputMode="decimal"
            className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4"
            placeholder="0,7"
            value={data.inflation === null ? "" : String(data.inflation * 100)}
            onChange={(event) => {
              const raw = event.target.value.replace(",", ".");
              update((current) => ({ ...current, inflation: raw === "" ? null : Math.min(0.2, Math.max(0, Number(raw) / 100 || 0)) }));
            }}
          />
        </label>
        {goal && goalPrice ? (
          <p className="text-sm">
            Реальная цена {displayName(goal)} — {rub(goalPrice)}.{" "}
            {months === null
              ? "При таком темпе цель недостижима за 10 лет."
              : `Прогноз: ${months} ${plural(months, "месяц", "месяца", "месяцев")}.`}
          </p>
        ) : (
          <p className="text-sm text-muted">Выберите цель, чтобы увидеть прогноз.</p>
        )}
      </Card>

      <ul className="space-y-2">
        {[...data.deposits].sort((a, b) => b.date.localeCompare(a.date)).map((deposit) => (
          <li key={deposit.id} className="card flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="num font-medium">{rub(deposit.amount)}</p>
              <p className="text-sm text-muted">
                {labels.contributors[deposit.by]} · {deposit.date}
                {deposit.note ? ` · ${deposit.note}` : ""}
              </p>
            </div>
            <button type="button" className="text-sm text-danger" onClick={() => removeDeposit(deposit.id)}>
              Удалить
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => download(backupFilename(todayIso()), JSON.stringify(exportPayload(data), null, 2), "application/json")}>
          Экспортировать
        </Button>
        <label className="inline-flex h-12 cursor-pointer items-center rounded-full bg-canvas-secondary px-5 text-sm font-medium">
          Импортировать
          <input
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                replaceAll(parseImport(await file.text()));
              } catch {
                replaceAll(data);
              }
            }}
          />
        </label>
        <Button variant="secondary" onClick={() => download("kopilka.ics", buildIcs(), "text/calendar")}>
          Напоминание в календарь
        </Button>
        <Button variant="ghost" onClick={() => setConfirm(true)}>
          Удалить все данные копилки
        </Button>
      </div>

      <Sheet open={confirm} title="Удалить все данные копилки" onClose={() => setConfirm(false)}>
          <p className="text-sm">Это сотрёт взносы и выбранную цель в этом браузере. Отметки осмотра и экзамен останутся. Сначала можно экспортировать файл.</p>
        <Button
          variant="danger"
          className="mt-4 w-full"
          onClick={() => {
            update((current) => ({ ...current, deposits: [], goalSlug: null, monthly: 0, seenLevel: 0 }));
            setConfirm(false);
          }}
        >
          Удалить {data.deposits.length} {plural(data.deposits.length, "взнос", "взноса", "взносов")}
        </Button>
      </Sheet>
    </div>
  );
}
