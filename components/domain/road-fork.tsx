"use client";

import { useUi, useUser } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { scoreText } from "@/lib/cn";
import { labels } from "@/lib/content";
import { approxRub, rub, todayIso } from "@/lib/format";
import { displayName, type CatalogItem } from "@/lib/market";
import { experiencePurchaseLine, meta, purchaseQuote, type PurchaseQuote } from "@/lib/meta";
import { inflationOf } from "@/lib/storage";
import { TIER_MAX } from "@/lib/tiers";
import {
  aimContrast,
  almostAffordable,
  almostNote,
  bestSafeAt,
  DECENT_SCORE,
  familyContribution,
  leftForCar,
  nextDecentAt,
  nextJumpAfter,
  nextQualityAt,
  nextWithinReach,
  priceStatus,
  purchasePrice,
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

function waitLine(months: number | null, monthly: number): string {
  if (months === null) return "срок появится, когда укажешь взнос в месяц";
  return `около ${months} мес. при ${rub(monthly)} в месяц`;
}

function PriceFacts({ item, quote }: { item: CatalogItem; quote: PurchaseQuote }) {
  const reserve = Math.round(item.median * meta.reserveRate);
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer">Из чего складывается</summary>
      <ul className="mt-2 space-y-1 text-muted">
        <li>Медиана: {rub(item.median)}</li>
        <li>ОСАГО: {rub(quote.osago)}</li>
        <li>Учёт: {rub(meta.registrationRub)}</li>
        {meta.diagnosticCardRub > 0 ? <li>Диагностическая карта: {rub(meta.diagnosticCardRub)}</li> : null}
        <li>ТО: {rub(meta.firstServiceRub)}</li>
        <li>Резерв {Math.round(meta.reserveRate * 100)}%: {rub(reserve)}</li>
        <li>Итого: {rub(quote.total)}</li>
        <li>{experiencePurchaseLine(quote.experienceYears)}</li>
      </ul>
    </details>
  );
}

export function RoadFork({ items }: { items: CatalogItem[] }) {
  const { ready, data, saved } = useUser();
  const { setDepositOpen } = useUi();
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState(saved);
  const [pulse, setPulse] = useState<{ amount: number; token: number } | null>(null);
  const [snapNote, setSnapNote] = useState("");
  const [asOf, setAsOf] = useState("");
  const snaps = useMemo(() => snapPoints(items, data.driver), [items, data.driver]);
  const announced = useRef<number | null>(null);

  useEffect(() => {
    if (ready) setPreview(saved);
  }, [ready, saved]);

  useEffect(() => {
    setAsOf(todayIso());
  }, []);

  if (!ready) return null;

  const amount = shownSavings(saved);
  const driver = { ...data.driver, onParentPolicy: data.onParentPolicy };
  const inflation = inflationOf(data);
  const today = bestSafeAt(items, amount, driver);
  const almost = almostAffordable(items, amount, data.monthly, driver);
  const almostText = almost ? almostNote(almost.item, almost.gap, data.monthly, today?.score ?? null) : null;
  const family = familyContribution(data.deposits);
  const remainder = leftForCar(amount, today, driver);
  const jump = nextJumpAfter(items, amount, driver);
  const later = nextQualityAt(items, amount, driver);
  const jumpCar = jump === null ? null : bestSafeAt(items, jump, driver);
  const laterCar = later === null ? null : bestSafeAt(items, later, driver);
  const nearestAim = nextWithinReach(items, amount, driver);
  const decentAim = nextDecentAt(items, amount, driver);
  const showPair = (!today || today.score < DECENT_SCORE) && nearestAim !== null && decentAim !== null && nearestAim.slug !== decentAim.slug;
  const quoteOf = (car: CatalogItem) =>
    purchaseQuote({
      median: car.median,
      hp: car.hp,
      driver,
      licenseDate: data.licenseDate,
      onParentPolicy: data.onParentPolicy,
      saved: amount,
      monthly: data.monthly,
      inflation,
      asOf,
    });
  const todayQuote = today ? quoteOf(today) : null;
  const nearestQuote = nearestAim ? quoteOf(nearestAim) : null;
  const decentQuote = decentAim ? quoteOf(decentAim) : null;
  const jumpQuote = jumpCar ? quoteOf(jumpCar) : null;
  const laterQuote = laterCar ? quoteOf(laterCar) : null;
  const nearestMonths = nearestQuote?.months ?? null;
  const decentMonths = decentQuote?.months ?? null;
  const months = jumpQuote?.months ?? null;
  const laterMonths = laterQuote?.months ?? null;
  const window = roadWindow(preview, expanded);
  const posts = [
    ...window.behind.map((post) => ({ amount: post, you: false, tier: true })),
    { amount: preview, you: true, tier: window.onPost },
    ...window.ahead.map((post) => ({ amount: post, you: false, tier: true })),
  ];
  const seedRoad = posts.some((post) => {
    const car = bestSafeAt(items, post.amount, driver);
    return !car || car.isSeed;
  });
  const previewCar = bestSafeAt(items, preview, driver);

  function commit(raw: number) {
    const hit = snaps.find((snap) => Math.abs(snap.amount - raw) <= 10_000);
    const next = hit?.amount ?? raw;
    const car = bestSafeAt(items, next, driver);
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
            const car = bestSafeAt(items, post.amount, driver);
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
              <p className="mt-2 text-sm text-muted">
                Медиана {rub(today.median)}. С расходами {approxRub(todayQuote?.total ?? purchasePrice(today, driver))}. {priceStatus(today).join(" · ")}
              </p>
              {todayQuote ? <PriceFacts item={today} quote={todayQuote} /> : null}
              {almostText ? <p className="mt-2 text-sm">{almostText}</p> : null}
            </>
          ) : (
            <>
              <h2 className="mt-1 text-xl font-semibold">В этой сумме машины нет</h2>
              <p className="mt-2 text-sm">
                {showPair
                  ? "Сравнение двух целей — на соседней карточке. Суммы там округлены до тысяч."
                  : nearestAim
                    ? <>Ближайшая — <Link href={`/cars/${nearestAim.slug}`}>{displayName(nearestAim)}</Link>, {approxRub(nearestQuote?.total ?? purchasePrice(nearestAim, driver))}. Медиана {rub(nearestAim.median)}.</>
                    : "В каталоге пока нет машин с ценой."}
              </p>
              {almostText ? <p className="mt-2 text-sm">{almostText}</p> : null}
            </>
          )}
        </Card>
        <Card>
          {showPair && nearestAim && decentAim ? (
            <>
              <p className="text-sm text-muted">Две цели</p>
              <h2 className="mt-1 text-xl font-semibold">Ближайшая или заметно лучше</h2>
              <p className="mt-3 text-sm">
                <Link href={`/cars/${nearestAim.slug}`}>{displayName(nearestAim)}</Link> — {approxRub(nearestQuote?.total ?? purchasePrice(nearestAim, driver))}, {waitLine(nearestMonths, data.monthly)}. Оценка {scoreText(nearestAim.score)}.
              </p>
              {nearestQuote ? <PriceFacts item={nearestAim} quote={nearestQuote} /> : null}
              <p className="mt-3 text-sm">
                <Link href={`/cars/${decentAim.slug}`}>{displayName(decentAim)}</Link> — {approxRub(decentQuote?.total ?? purchasePrice(decentAim, driver))}, {waitLine(decentMonths, data.monthly)}. Оценка {scoreText(decentAim.score)}. Это заметно лучше машина.
              </p>
              {nearestMonths !== null && decentMonths !== null && aimContrast(nearestMonths, nearestAim.score, decentMonths, decentAim.score) ? (
                <p className="mt-2 text-sm font-medium">{aimContrast(nearestMonths, nearestAim.score, decentMonths, decentAim.score)}</p>
              ) : null}
              {decentQuote ? <PriceFacts item={decentAim} quote={decentQuote} /> : null}
            </>
          ) : jump !== null ? (
            <>
              <p className="text-sm text-muted">Накопить до {approxRub(jump)}</p>
              <h2 className="mt-1 text-xl font-semibold">{jumpCar ? <Link href={`/cars/${jumpCar.slug}`}>{displayName(jumpCar)}</Link> : "На этой отметке"}</h2>
              {jumpCar ? (
                <p className="mt-2 text-sm">
                  Оценка {scoreText(jumpCar.score)}. {labels.verdict[jumpCar.bestGearbox]}.
                </p>
              ) : null}
              <p className="mt-2 text-sm">{months === null ? "Срок появится, когда укажешь взнос в месяц." : `Около ${months} мес. при ${rub(data.monthly)} в месяц.`}</p>
              {jumpCar && jumpQuote ? <PriceFacts item={jumpCar} quote={jumpQuote} /> : null}
            </>
          ) : (
            <>
              <p className="text-sm text-muted">{today ? "Дальше 150 000 ₽" : "Первая машина"}</p>
              <h2 className="mt-1 text-xl font-semibold">
                {laterMonths !== null && laterMonths > 12 && today ? "Можно брать сегодняшнюю" : laterCar ? <Link href={`/cars/${laterCar.slug}`}>{displayName(laterCar)}</Link> : "Дальше по каталогу"}
              </h2>
              <p className="mt-2 text-sm">
                {later !== null && laterCar ? (
                  <>
                    {today ? <>Лучше этой машины до {approxRub(later)} не будет. Там {displayName(laterCar)}</> : <>До {displayName(laterCar)} нужно {approxRub(later)}</>}
                    {laterMonths === null
                      ? ". Срок появится, когда укажешь взнос в месяц."
                      : `: около ${laterMonths} мес. при ${rub(data.monthly)} в месяц.`}
                    {today && laterMonths !== null && laterMonths > 12 ? " Можно брать сегодняшнюю." : ""}
                  </>
                ) : (
                  "Дальше по каталогу заметно лучше не станет. Можно брать сегодняшнюю."
                )}
              </p>
              {laterCar && laterQuote ? <PriceFacts item={laterCar} quote={laterQuote} /> : null}
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
