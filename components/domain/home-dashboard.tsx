"use client";

import { LicenseField } from "@/components/domain/license-field";
import { RoadFork } from "@/components/domain/road-fork";
import { useUser } from "@/components/providers";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { earnedBadges } from "@/lib/badges";
import { labels } from "@/lib/content";
import { addMonths } from "@/lib/forecast";
import { rub, todayIso } from "@/lib/format";
import { purchaseQuote, type DriverProfile } from "@/lib/meta";
import { displayName, type CatalogItem } from "@/lib/market";
import { inflationOf } from "@/lib/storage";
import { amountForLevel, levelForAmount, tierAmounts } from "@/lib/tiers";
import { bestSafeAt, shownSavings } from "@/lib/view/market";
import { scoreText } from "@/lib/cn";
import Link from "next/link";
import { useEffect, useState } from "react";

export function HomeDashboard({ items }: { items: CatalogItem[] }) {
  const { ready, data, saved, update } = useUser();
  const [asOf, setAsOf] = useState<string | null>(null);
  useEffect(() => {
    setAsOf(todayIso());
  }, []);
  if (!ready) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Загрузка копилки">
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  const amount = shownSavings(saved);
  const level = levelForAmount(amount);
  const goal = items.find((item) => item.slug === data.goalSlug) ?? null;
  const goalQuote = goal
    ? purchaseQuote({
        median: goal.median,
        hp: goal.hp,
        driver: data.driver,
        licenseDate: data.licenseDate,
        saved: amount,
        monthly: data.monthly,
        inflation: inflationOf(data),
        asOf: asOf ?? "",
      })
    : null;
  const goalPrice = goalQuote?.total ?? null;
  const unlocked = level > data.seenLevel && level > 0 ? bestSafeAt(items, amountForLevel(level), data.driver) : null;
  const people = new Set(data.deposits.map((deposit) => deposit.by)).size;
  const badges = earnedBadges({
    saved: amount,
    goalPrice,
    contributors: people,
    quizPassed: data.quizPassed,
    vinGuideDone: data.vinGuideDone,
  });

  return (
    <div className="space-y-8">
      <RoadFork items={items} />
      <Card>
        <h2 className="text-lg font-semibold">Права</h2>
        <div className="mt-3">
          <LicenseField />
        </div>
      </Card>
      {unlocked ? (
        <Card>
          <p className="text-sm text-muted">Открылась отметка</p>
          <h2 className="mt-1 text-xl font-semibold">
            {displayName(unlocked)}, оценка {scoreText(unlocked.score)}
          </h2>
          <p className="mt-2 text-sm text-muted">{unlocked.summary}</p>
          <div className="mt-4 flex gap-3">
            <Link href={`/cars/${unlocked.slug}`} className="text-sm font-medium">
              Открыть карточку
            </Link>
            <button type="button" className="text-sm text-muted" onClick={() => update((current) => ({ ...current, seenLevel: level }))}>
              Понятно
            </button>
          </div>
        </Card>
      ) : null}
      <Card>
        <h2 className="text-lg font-semibold">Цель</h2>
        <label className="mt-3 block text-sm">
          Машина-цель
          <select
            className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4"
            value={data.goalSlug ?? ""}
            onChange={(event) => update((current) => ({ ...current, goalSlug: event.target.value || null }))}
          >
            <option value="">Не выбрана</option>
            {items.map((item) => (
              <option key={item.slug} value={item.slug}>
                {displayName(item)} · {rub(item.median)}
              </option>
            ))}
          </select>
        </label>
      </Card>
      {goal && goalQuote ? (
        <ForecastLine
          saved={amount}
          monthly={data.monthly}
          months={goalQuote.months}
          inflation={inflationOf(data)}
          name={displayName(goal)}
          items={items}
          asOf={asOf}
          driver={data.driver}
          licenseDate={data.licenseDate}
        />
      ) : null}
      {badges.length ? (
        <ul className="flex flex-wrap gap-2">
          {badges.map((id) => (
            <li key={id} className="rounded-full bg-canvas-secondary px-3 py-2 text-sm">
              {labels.badges[id].title}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ForecastLine({
  saved,
  monthly,
  months,
  inflation,
  name,
  items,
  asOf,
  driver,
  licenseDate,
}: {
  saved: number;
  monthly: number;
  months: number | null;
  inflation: number;
  name: string;
  items: CatalogItem[];
  asOf: string | null;
  driver: DriverProfile;
  licenseDate: string | null;
}) {
  if (monthly <= 0) {
    return <p className="text-sm text-muted">Укажите ежемесячный взнос в копилке — появится прогноз до {name}.</p>;
  }
  if (months === null) {
    const reachable = [...tierAmounts()].reverse().find((tier) => {
      const car = bestSafeAt(items, tier);
      if (!car || !asOf) return false;
      return purchaseQuote({
        median: car.median,
        hp: car.hp,
        driver,
        licenseDate,
        saved,
        monthly,
        inflation,
        asOf,
      }).months !== null;
    });
    const car = reachable ? bestSafeAt(items, reachable) : null;
    return (
      <p className="text-sm">
        При {rub(monthly)} в месяц {name} уходит быстрее, чем пополняется копилка.
        {car && reachable ? ` Ближайший достижимый уровень — ${rub(reachable)}, ${displayName(car)}.` : ""}
      </p>
    );
  }
  const label = asOf
    ? new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(addMonths(asOf, months))
    : null;
  return (
    <p className="text-sm">
      При {rub(monthly)} в месяц вы дойдёте до {name}
      {label ? ` к ${label}` : ` через ${months} мес.`}. В прогнозе цены растут на {(inflation * 100).toFixed(1).replace(".", ",")}% в месяц.
    </p>
  );
}
