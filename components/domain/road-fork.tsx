"use client";

import { useUi, useUser } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { scoreText } from "@/lib/cn";
import { labels } from "@/lib/content";
import { monthsToGoal } from "@/lib/forecast";
import { rub } from "@/lib/format";
import { displayName, type CatalogItem } from "@/lib/market";
import { inflationOf } from "@/lib/storage";
import { TIER_MAX } from "@/lib/tiers";
import {
  bestSafeAt,
  familyContribution,
  leftForCar,
  nextJumpAfter,
  nextQualityAt,
  plateauUntil,
  priceStatus,
  roadWindow,
  shownSavings,
  snapPoints,
} from "@/lib/view/market";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

function shortAmount(amount: number): string {
  if (amount >= 1_000_000) return "1 млн";
  return String(Math.round(amount / 1000));
}

export function RoadFork({ items }: { items: CatalogItem[] }) {
  const { ready, data, saved } = useUser();
  const { setDepositOpen } = useUi();
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState(saved);
  const [pulse, setPulse] = useState<{ amount: number; token: number } | null>(null);
  const [snapNote, setSnapNote] = useState("");
  const snaps = useMemo(() => snapPoints(items), [items]);
  const announced = useRef<number | null>(null);

  useEffect(() => {
    if (ready) setPreview(saved);
  }, [ready, saved]);

  if (!ready) return null;

  const amount = shownSavings(saved);
  const inflation = inflationOf(data);
  const today = bestSafeAt(items, amount);
  const family = familyContribution(data.deposits);
  const remainder = leftForCar(amount, today, data.driver);
  const jump = nextJumpAfter(items, amount);
  const plateau = plateauUntil(items, amount);
  const later = nextQualityAt(items, amount);
  const jumpCar = jump === null ? null : bestSafeAt(items, jump);
  const laterCar = later === null ? null : bestSafeAt(items, later);
  const months = jump === null ? null : monthsToGoal(amount, data.monthly, jump, inflation);
  const nearest = [...items].sort((left, right) => left.median - right.median)[0];
  const window = roadWindow(preview, expanded);
  const posts = [
    ...window.behind.map((post) => ({ amount: post, you: false, tier: true })),
    { amount: preview, you: true, tier: window.onPost },
    ...window.ahead.map((post) => ({ amount: post, you: false, tier: true })),
  ];
  const seedRoad = posts.some((post) => {
    const car = bestSafeAt(items, post.amount);
    return !car || car.isSeed;
  });
  const previewCar = bestSafeAt(items, preview);

  function commit(raw: number) {
    const hit = snaps.find((snap) => Math.abs(snap.amount - raw) <= 10_000);
    const next = hit?.amount ?? raw;
    const car = bestSafeAt(items, next);
    setPreview(next);
    if (!hit) {
      announced.current = null;
      return;
    }
    if (announced.current === hit.amount) return;
    announced.current = hit.amount;
    setPulse({ amount: hit.amount, token: Date.now() });
    const honesty = car?.isSeed ? " По стартовому ориентиру, не по замеру объявлений." : "";
    setSnapNote(hit.kind === "gearbox" ? `Коробка больше не в списке «не брать».${honesty}` : `Выгодная точка.${honesty}`);
  }

  return (
    <div className="space-y-5 md:space-y-8">
      <header className="space-y-2 md:space-y-3">
        <p className="text-sm text-muted">В копилке</p>
        <h1 className="num text-4xl leading-none font-semibold tracking-tight md:text-6xl">{rub(amount)}</h1>
        {family > 0 ? <p className="text-family font-medium">Из них {rub(family)} — вклад семьи</p> : null}
        {today && remainder !== null ? (
          <p className="text-sm">
            {remainder >= 0
              ? <>На машину остаётся {rub(remainder)}. Старт — разница между реальной ценой и медианой {displayName(today)}.</>
              : <>На машину пока не остаётся: старт для {displayName(today)} больше копилки на {rub(Math.abs(remainder))}.</>}
          </p>
        ) : (
          <p className="text-sm">Пока нет машины, от которой считать старт. Дорога уже нарисована.</p>
        )}
        <Button onClick={() => setDepositOpen(true)}>{data.deposits.length ? "Добавить взнос" : "Указать накопления"}</Button>
      </header>

      <section className="space-y-3 md:space-y-4" aria-label="Дорога">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Дорога</h2>
          <button type="button" className="text-sm font-medium" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Только рядом" : "Вся дорога"}
          </button>
        </div>
        <ul className={`road-scroll ${expanded ? "is-full" : ""} ${seedRoad ? "is-seed-road" : ""}`}>
          {posts.map((post) => {
            const car = bestSafeAt(items, post.amount);
            const seed = !car || car.isSeed;
            const snapped = pulse?.amount === post.amount;
            return (
              <li
                key={`${post.you ? "you" : "post"}-${post.amount}`}
                className={`road-post ${seed ? "is-seed" : ""} ${post.you ? "is-you" : ""} ${snapped ? "is-snap road-snap" : ""}`}
              >
                <span key={pulse && snapped ? pulse.token : "dot"} className="road-dot" />
                <span className="num block">{shortAmount(post.amount)}</span>
                <span className={`road-name ${post.you && preview === amount ? "whitespace-nowrap" : ""}`}>{post.you && preview === amount ? "ты здесь" : car ? displayName(car) : "пока пусто"}</span>
              </li>
            );
          })}
        </ul>
        {seedRoad ? <p className="text-sm text-muted">Пунктир — стартовый ориентир. Это не замер объявлений.</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2" aria-label="Развилка">
        <Card>
          <p className="text-sm text-muted">Сегодня</p>
          {today ? (
            <>
              <h2 className="mt-1 text-xl font-semibold">
                <Link href={`/cars/${today.slug}`}>{displayName(today)}</Link>
              </h2>
              <p className="mt-2 text-sm">
                Оценка {scoreText(today.score)}. {labels.verdict[today.bestGearbox]}.
              </p>
              <p className="mt-2 text-sm text-muted">Медиана {rub(today.median)}. {priceStatus(today).join(" · ")}</p>
            </>
          ) : (
            <>
              <h2 className="mt-1 text-xl font-semibold">В этой сумме машины нет</h2>
              <p className="mt-2 text-sm">
                {nearest ? (
                  <>
                    Ближайшая в каталоге — <Link href={`/cars/${nearest.slug}`}>{displayName(nearest)}</Link>, медиана {rub(nearest.median)}.
                  </>
                ) : (
                  "В каталоге пока нет машин с ценой."
                )}
              </p>
            </>
          )}
        </Card>
        <Card>
          {jump !== null ? (
            <>
              <p className="text-sm text-muted">Подождать до {rub(jump)}</p>
              <h2 className="mt-1 text-xl font-semibold">{jumpCar ? <Link href={`/cars/${jumpCar.slug}`}>{displayName(jumpCar)}</Link> : "На этой отметке"}</h2>
              {jumpCar ? (
                <p className="mt-2 text-sm">
                  Оценка {scoreText(jumpCar.score)}. {labels.verdict[jumpCar.bestGearbox]}.
                </p>
              ) : null}
              <p className="mt-2 text-sm">
                {months === null
                  ? "Срок появится, когда укажешь взнос в месяц."
                  : `Около ${months} мес. при ${rub(data.monthly)} в месяц.`}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">Ждать ближайшие 150 000 ₽</p>
              <h2 className="mt-1 text-xl font-semibold">
                {later !== null && later - amount <= 150_000 ? "Ближайшая перемена" : "Ждать не стоит"}
              </h2>
              <p className="mt-2 text-sm">
                {later !== null && later - amount > 150_000 ? (
                  <>
                    До {rub(plateau)} лучше не станет. Бери сегодняшнюю или копи сразу до {rub(later)}
                    {laterCar ? <> — там {displayName(laterCar)}</> : null}.
                  </>
                ) : later !== null ? (
                  <>
                    Выгодной точки рядом нет. Ближайшая перемена — {rub(later)}
                    {laterCar ? <>, {displayName(laterCar)}</> : null}.
                  </>
                ) : (
                  "Дальше по каталогу заметно лучше не станет. Бери сегодняшнюю."
                )}
              </p>
            </>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium">А если</span>
          <input
            className="mt-3 w-full accent-[var(--accent)]"
            type="range"
            min={0}
            max={TIER_MAX}
            step={10_000}
            value={Math.min(TIER_MAX, Math.max(0, preview))}
            aria-valuetext={`${rub(preview)}. ${previewCar ? displayName(previewCar) : "машины без пометки «не брать» нет"}`}
            onChange={(event) => setPreview(Number(event.target.value))}
            onPointerUp={(event) => commit(Number(event.currentTarget.value))}
            onKeyUp={(event) => commit(Number(event.currentTarget.value))}
          />
        </label>
        <p className="text-sm">
          Если в копилке будет {rub(preview)}: {previewCar ? displayName(previewCar) : "машины без пометки «не брать» нет"}.
          {preview !== amount ? " Копилка не меняется." : ""}
        </p>
        <p className="text-sm text-muted" aria-live="polite">
          {snapNote || "На выгодной точке ползунок щёлкает. В копилку это не пишется."}
        </p>
      </section>

      <Card>
        <h2 className="text-lg font-semibold">Пока тебя не было</h2>
        <p className="mt-2 text-sm text-muted">
          Сводку за время отсутствия пока не из чего собрать: в копилке нет месяца последнего визита.
        </p>
      </Card>
    </div>
  );
}
