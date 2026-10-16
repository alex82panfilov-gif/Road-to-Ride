"use client";

import { AdviceMark } from "@/components/domain/advice-mark";
import { PriceChart } from "@/components/domain/price-chart";
import { RiskItem } from "@/components/domain/risk-item";
import { ScorePill } from "@/components/domain/score-pill";
import { ListingForm } from "@/components/domain/listing-form";
import { useUser } from "@/components/providers";
import { Card } from "@/components/ui/card";
import { adviseFor, markBest } from "@/lib/advice";
import { labels, sellerScript } from "@/lib/content";
import { km, rub } from "@/lib/format";
import { realPrice, osagoRange, meta } from "@/lib/meta";
import { displayName, type CatalogItem, type PricePoint } from "@/lib/market";
import type { PickedPrice } from "@/lib/prices";
import type { Model } from "@/lib/schema";
import { tierAmounts } from "@/lib/tiers";
import { avoidExcuse, cheaperTrap } from "@/lib/view/advice";
import { priceStatus } from "@/lib/view/market";
import { searchLinks } from "@/lib/view/search";
import { MarketSearch } from "@/components/domain/search-links";
import { TermText } from "@/components/domain/term-text";
import Link from "next/link";
import { useMemo, useState } from "react";

export function ModelArticle({
  model,
  price,
  history,
  items,
}: {
  model: Model;
  price: PickedPrice;
  history: PricePoint[];
  items: CatalogItem[];
}) {
  const { data, saved, ready } = useUser();
  const [copied, setCopied] = useState(false);
  const [adviceOpen, setAdviceOpen] = useState(true);
  const advice = useMemo(() => {
    const models = items.map((item) => ({
      slug: item.slug,
      budgetRules: item.budgetRules,
      gearboxes: item.gearboxes,
      mileage: item.mileage,
      subScores: item.subScores,
      price: { median: item.median, medianMileageKm: item.medianMileageKm },
    }));
    const paired = items.map((item, index) => ({ item, m: models[index], advice: adviseFor(models[index], item.median, models) }));
    markBest(paired, ready && saved > 0 ? saved : price.median);
    return paired.find((row) => row.item.slug === model.slug)?.advice ?? null;
  }, [items, price.median, model.slug, ready, saved]);
  const caveat = cheaperTrap({ median: price.median, budgetRules: model.budgetRules });
  const hp = model.engines.find((engine) => engine.recommended)?.hp ?? model.engines[0].hp;
  const driver = { ...data.driver, onParentPolicy: data.onParentPolicy };
  const purchase = realPrice(price.median, hp, driver);
  const osago = osagoRange(hp, driver);
  const reserve = Math.round(price.median * meta.reserveRate);
  const tier = tierAmounts().find((amount) => amount >= price.median) ?? tierAmounts().at(-1)!;

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm text-muted">
          {model.years[0]}–{model.years[1]} · {labels.bodies[model.body]}
        </p>
        <h1 className="text-[2rem] leading-tight font-semibold">
          {displayName(model)} <span className="text-muted">{model.generation}</span>
        </h1>
      </header>

      <section className="space-y-3" aria-label="Вердикт">
        {model.summary ? (
          <p>
            <TermText text={model.summary} />
          </p>
        ) : null}
        <h2 className="text-lg font-semibold">Коробка</h2>
        <ul className="space-y-2 text-sm">
          {model.gearboxes.map((box) => (
            <li key={box.name}>
              <TermText text={`${labels.gearbox[box.type]} — ${labels.verdict[box.verdict]}`} />
            </li>
          ))}
        </ul>
        {advice ? (
          <AdviceMark
            advice={advice}
            items={items}
            car={items.find((item) => item.slug === model.slug)}
            catalog={items}
            saved={saved}
            driver={driver}
            open={adviceOpen}
            onToggle={() => setAdviceOpen((value) => !value)}
          />
        ) : null}
        {advice?.verdict !== "avoid" && caveat ? <p className="text-sm">{caveat}</p> : null}
        <ScorePill
          score={scoreOf(model)}
          excuse={
            advice?.verdict === "avoid"
              ? avoidExcuse(
                  items.find((item) => item.slug === model.slug) ?? {
                    median: price.median,
                    bestGearbox: model.gearboxes.some((box) => box.verdict === "avoid" && box.type !== "MT") ? "avoid" : "recommended",
                    gearboxes: model.gearboxes,
                    budgetRules: model.budgetRules,
                  },
                )
              : null
          }
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Цена</h2>
        <p className="num text-3xl font-semibold">{rub(price.median)}</p>
        <p className="text-sm text-muted">
          {priceStatus(price).join(" · ") || labels.confidence[price.confidence]}
          {" · "}
          обновлено {price.month}
          {price.sampleSize ? ` · ${price.sampleSize} объявлений` : " · без подсчёта объявлений"}
        </p>
        {price.isFallback ? <p className="text-sm">В этом месяце мало объявлений, показана цена за {price.month}.</p> : null}
      </section>

      <Card>
        <h2 className="text-lg font-semibold">Реальная цена</h2>
        <p className="num mt-2 text-3xl font-semibold">{rub(purchase)}</p>
        <ul className="mt-4 space-y-1 text-sm">
          <li>Медиана объявлений: {rub(price.median)}</li>
          <li>ОСАГО, середина вилки для вашего профиля: {rub(osago.mid)} ({rub(osago.min)}–{rub(osago.max)})</li>
          <li>Постановка на учёт: {rub(meta.registrationRub)}</li>
          <li>Первое ТО: {rub(meta.firstServiceRub)}</li>
          <li>Резерв {Math.round(meta.reserveRate * 100)}%: {rub(reserve)}</li>
        </ul>
        <p className="mt-3 text-sm text-muted">
          {meta.osago.note}{" "}
          <a href={meta.osago.sourceUrl}>{meta.osago.sourceTitle}</a>
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href={`/cost/${model.slug}`}>Калькулятор года владения</Link>
          <Link href={`/tiers/${tier}`}>Что ещё есть за {rub(tier)}</Link>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">На что смотреть</h2>
        {model.risks.map((risk) => (
          <RiskItem key={risk.title} risk={risk} />
        ))}
        {model.avoid.length ? <p className="text-sm">Лучше обходить: {model.avoid.join("; ")}.</p> : null}
      </section>

      <Link href={`/check/${model.slug}`} className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-5 font-medium text-accent-ink no-underline">
        Я у машины
      </Link>

      <details className="card p-4">
        <summary className="cursor-pointer font-semibold">Технические подробности</summary>
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <h2 className="font-semibold">Моторы и коробки</h2>
            <ul className="mt-2 space-y-2">
              {model.engines.map((engine) => (
                <li key={engine.code}>
                  {engine.code}: {engine.volumeL} л, {engine.hp} л.с., {engine.fuel === "petrol" ? "бензин" : engine.fuel},{" "}
                  {engine.timing === "belt" ? "ремень ГРМ" : "цепь ГРМ"}
                  {engine.recommended ? " — предпочтительный" : ""}
                </li>
              ))}
              {model.gearboxes.map((box) => (
                <li key={box.name}>
                  <TermText text={`${box.name} — ${labels.verdict[box.verdict]} · ${labels.gearbox[box.type]}${box.note ? `. ${box.note}` : ""}`} />
                </li>
              ))}
            </ul>
          </div>
          {model.listingRules?.length ? (
            <div>
              <h2 className="font-semibold">Как собирается выборка</h2>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {model.listingRules.map((rule) => (
                  <li key={rule}>
                    <TermText text={rule} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <h2 className="font-semibold">Оценки по частям</h2>
            <div className="mt-2 space-y-2">
              {Object.entries(labels.scoreNames).map(([key, title]) => (
                <p key={key}>
                  <span className="font-medium">
                    {title}: {model.subScores[key as keyof typeof model.subScores]} из 10.
                  </span>{" "}
                  {model.subScoreNotes[key]}
                </p>
              ))}
              <p className="text-muted">Итоговое число считает сайт, не автор карточки. Веса — на странице методики.</p>
            </div>
          </div>
        </div>
      </details>

      <section>
        <h2 className="text-lg font-semibold">Пробег</h2>
        <p className="mt-2 text-sm">
          Норма — около 15 тыс. км в год. У машины от 8 лет пробег меньше половины этой нормы подозрителен. Выше {km(model.mileage.avoidFrom)} эту модель лучше не рассматривать.
          В типичном объявлении сейчас около {km(price.medianMileageKm)}, год около {price.medianYear}.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Ориентир цены</h2>
        {history.length >= 2 ? <PriceChart points={history} /> : <p className="mt-2 text-sm text-muted">Истории цен пока нет: стартовые ориентиры на график не выводятся.</p>}
        {price.isSeed ? <p className="mt-2 text-sm text-muted">Это стартовый ориентир, не подсчёт объявлений.</p> : null}
        {price.isFallback ? <p className="mt-2 text-sm">В этом месяце мало объявлений, показана цена за {price.month}.</p> : null}
        {price.median > 1_000_000 ? <p className="mt-2 text-sm">Пока вне бюджета: медиана выше 1 000 000 ₽.</p> : null}
        {price.notes ? <p className="mt-2 text-sm text-muted">{price.notes}</p> : null}
        <div className="mt-3">
          <MarketSearch result={searchLinks(model, { median: price.median, savings: ready && saved > 0 ? saved : undefined })} />
        </div>
      </section>

      <ListingForm model={model} price={price} />

      <Card>
        <h2 className="text-lg font-semibold">Вопросы продавцу</h2>
        <p className="mt-3 text-sm">{sellerScript(model)}</p>
        <button
          type="button"
          className="mt-4 text-sm font-medium text-accent"
          onClick={async () => {
            await navigator.clipboard.writeText(sellerScript(model));
            setCopied(true);
          }}
        >
          {copied ? "Скопировано" : "Скопировать текст"}
        </button>
      </Card>
    </article>
  );
}

function scoreOf(model: Model): number {
  const weights = { reliability: 0.3, purchaseRisk: 0.2, ownershipCost: 0.2, safety: 0.15, liquidity: 0.15 } as const;
  const total = (Object.keys(weights) as (keyof typeof weights)[]).reduce((sum, key) => sum + model.subScores[key] * weights[key], 0);
  return Math.round(total * 10) / 10;
}
