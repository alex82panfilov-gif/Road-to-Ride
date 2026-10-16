"use client";

import { ScoreChart } from "@/components/domain/score-chart";
import { ScorePill } from "@/components/domain/score-pill";
import { TierDelta } from "@/components/domain/tier-delta";
import { useUi, useUser } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Ring } from "@/components/ui/ring";
import { Skeleton } from "@/components/ui/skeleton";
import { earnedBadges } from "@/lib/badges";
import { labels } from "@/lib/content";
import { addMonths, monthsToGoal } from "@/lib/forecast";
import { rub, todayIso } from "@/lib/format";
import { inflationOf } from "@/lib/storage";
import { realPrice } from "@/lib/meta";
import { meta } from "@/lib/meta";
import {
  bestAt,
  compareTiers,
  displayName,
  openedAt,
  tierLadder,
  type CatalogItem,
} from "@/lib/market";
import { amountForLevel, levelForAmount, nextTierAmount, progressToNextTier } from "@/lib/tiers";
import Link from "next/link";
import { useEffect, useState } from "react";

export function HomeDashboard({ items }: { items: CatalogItem[] }) {
  const { ready, data, saved, update } = useUser();
  const { setDepositOpen } = useUi();
  const [asOf, setAsOf] = useState<string | null>(null);
  useEffect(() => {
    setAsOf(todayIso());
  }, []);
  if (!ready) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Загрузка копилки">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="mx-auto h-56 w-56 rounded-full" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  const level = levelForAmount(saved);
  const goal = items.find((item) => item.slug === data.goalSlug) ?? null;
  const goalPrice = goal ? realPrice(goal.median, goal.hp, data.driver) : null;
  const next = nextTierAmount(saved);
  const remain = next === null ? 0 : Math.max(0, next - saved);
  const ladder = tierLadder(items);
  const sweet = meta.sweetSpots.find((amount) => saved >= amount * 0.8 && saved < amount);
  const sweetStep = sweet ? ladder.find((step) => step.amount === sweet) : null;
  const months = sweet && data.monthly > 0 ? monthsToGoal(saved, data.monthly, sweet, inflationOf(data)) : null;
  const available = bestAt(items, saved);
  const cheapest = [...items].sort((a, b) => a.median - b.median)[0];
  const unlocked = level > data.seenLevel && level > 0 ? openedAt(items, amountForLevel(level)) : null;
  const people = new Set(data.deposits.map((deposit) => deposit.by)).size;
  const badges = earnedBadges({
    saved,
    goalPrice,
    contributors: people,
    quizPassed: data.quizPassed,
    vinGuideDone: data.vinGuideDone,
  });

  return (
    <div className="space-y-8">
      <header className="space-y-6">
        <h1 className="num text-center text-[2.5rem] leading-[1.2] font-semibold tracking-tight">Накоплено {rub(saved)}</h1>
        <Ring
          outer={progressToNextTier(saved)}
          inner={goalPrice ? Math.min(1, saved / goalPrice) : 0}
          outerLabel={next ? `До следующего уровня ${rub(remain)}` : "Верхняя отметка каталога"}
          innerLabel={goal && goalPrice ? `До ${displayName(goal)} по реальной цене ${rub(Math.max(0, goalPrice - saved))}` : "Машина-цель пока не выбрана"}
        />
        <Button className="w-full" onClick={() => setDepositOpen(true)}>
          {data.deposits.length ? "Добавить взнос" : "Добавить первый взнос"}
        </Button>
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
                {displayName(item)} · {rub(item.median)}
              </option>
            ))}
          </select>
        </label>
      </header>

      {unlocked ? (
        <Card className="unlock-pop">
          <p className="text-sm text-muted">Открыто</p>
          <h2 className="mt-1 text-xl font-semibold">
            {displayName(unlocked)}, оценка {unlocked.score.toFixed(1).replace(".", ",")}
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

      {sweet && sweetStep ? (
        <Card>
          <p className="text-sm">
            До уровня {sweetStep.score.toFixed(1).replace(".", ",")} балла осталось {rub(sweet - saved)}
            {months !== null ? ` — около ${months} мес.` : ""}. Возможно, стоит подождать.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Доступно сейчас</h2>
          {available ? (
            <>
              <p className="mt-3 font-medium">
                <Link href={`/cars/${available.slug}`}>{displayName(available)}</Link>
              </p>
              <ScorePill score={available.score} />
              <p className="mt-2 text-sm text-muted">
                Медиана {rub(available.median)}. Реально к покупке {rub(realPrice(available.median, available.hp, data.driver))}.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">
              До самой доступной машины в каталоге ещё копим. Ближайшая — {displayName(cheapest)} за {rub(cheapest.median)}.
            </p>
          )}
        </Card>
        <TierDelta comparison={compareTiers(items, Math.max(saved, 0))} />
      </div>

      {goal && goalPrice ? (
        <ForecastLine saved={saved} monthly={data.monthly} target={goalPrice} inflation={inflationOf(data)} name={displayName(goal)} items={items} asOf={asOf} />
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

      <Card>
        <h2 className="text-lg font-semibold">Оценка от бюджета</h2>
        <div className="mt-4">
          <ScoreChart steps={ladder} marks={meta.sweetSpots} />
        </div>
      </Card>
    </div>
  );
}

function ForecastLine({
  saved,
  monthly,
  target,
  inflation,
  name,
  items,
  asOf,
}: {
  saved: number;
  monthly: number;
  target: number;
  inflation: number;
  name: string;
  items: CatalogItem[];
  asOf: string | null;
}) {
  if (monthly <= 0) {
    return <p className="text-sm text-muted">Укажите ежемесячный взнос в копилке — появится прогноз до {name}.</p>;
  }
  const months = monthsToGoal(saved, monthly, target, inflation);
  if (months === null) {
    const reachable = [...tierLadder(items)].reverse().find((step) => step.best && monthsToGoal(saved, monthly, realPrice(step.best.median, step.best.hp), inflation) !== null);
    return (
      <p className="text-sm">
        При {rub(monthly)} в месяц {name} уходит быстрее, чем пополняется копилка.
        {reachable?.best ? ` Ближайший достижимый уровень — ${rub(reachable.amount)}, ${displayName(reachable.best)}.` : ""}
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

