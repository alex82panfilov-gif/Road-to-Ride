"use client";

import { AdviceMark, Sign, type ModelLink } from "@/components/domain/advice-mark";
import { ScorePill } from "@/components/domain/score-pill";
import { useUser } from "@/components/providers";
import { Sheet } from "@/components/ui/sheet";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { adviseFor, markBest, trapsFor } from "@/lib/advice";
import { labels } from "@/lib/content";
import { approxRub, rub } from "@/lib/format";
import { displayName, type CatalogItem } from "@/lib/market";
import type { TTrap } from "@/lib/schema";
import { TIER_MAX } from "@/lib/tiers";
import { inflationOf } from "@/lib/storage";
import { realPrice } from "@/lib/meta";
import { catalogBands, priceStatus, shownSavings } from "@/lib/view/market";
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const sorts = {
  score: "Оценка",
  price: "Цена",
  mileage: "Пробег",
  year: "Год",
} as const;

export function CatalogBrowser({
  items,
  pending = [],
  traps = [],
  links = [],
}: {
  items: CatalogItem[];
  pending?: { slug: string; brand: string; model: string }[];
  traps?: TTrap[];
  links?: ModelLink[];
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { saved, data, ready: userReady } = useUser();
  const [body, setBody] = useState("");
  const [sort, setSort] = useState<keyof typeof sorts>("score");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [openSign, setOpenSign] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!userReady) return;
    const nextBody = params.get("body") ?? "";
    setBody(nextBody in labels.bodies ? nextBody : "");
    const nextSort = params.get("sort");
    if (nextSort && nextSort in sorts) setSort(nextSort as keyof typeof sorts);
    setDir(params.get("dir") === "asc" ? "asc" : "desc");
    const nextView = params.get("view");
    setView(nextView === "mine" || nextView === "goal" ? nextView : "all");
    setReady(true);
  }, [params, userReady]);

  function writeUrl(next: { body?: string; sort?: keyof typeof sorts; dir?: "asc" | "desc"; view?: string }) {
    const query = new URLSearchParams(params.toString());
    query.delete("budget");
    const bodyValue = next.body ?? body;
    if (bodyValue) query.set("body", bodyValue);
    else query.delete("body");
    query.set("sort", next.sort ?? sort);
    query.set("dir", next.dir ?? dir);
    query.set("view", next.view ?? view);
    router.push(`${pathname}?${query.toString()}`);
  }

  const amount = shownSavings(saved);
  const adviceBySlug = useMemo(() => {
    const models = items.map((item) => ({
      slug: item.slug,
      budgetRules: item.budgetRules,
      gearboxes: item.gearboxes,
      mileage: item.mileage,
      subScores: item.subScores,
      price: { median: item.median, medianMileageKm: item.medianMileageKm },
    }));
    const paired = items.map((item, index) => ({ item, m: models[index], advice: adviseFor(models[index], amount, models) }));
    markBest(paired, amount);
    return new Map(paired.map((row) => [row.item.slug, row.advice]));
  }, [items, amount]);

  const bands = useMemo(() => catalogBands(items, amount, data.monthly, inflationOf(data), data.driver), [items, amount, data.monthly, data]);

  function prepare(list: CatalogItem[]) {
    return list
      .filter((item) => (body ? item.body === body : true))
      .filter((item) => (view === "goal" ? item.slug === data.goalSlug : true))
      .sort((left, right) => {
        const factor = dir === "asc" ? 1 : -1;
        const value = (item: CatalogItem) =>
          sort === "score" ? item.score : sort === "price" ? item.median : sort === "mileage" ? item.medianMileageKm : item.medianYear;
        return (value(left) - value(right)) * factor;
      });
  }

  const groups = [
    { id: "pocket", title: "По карману", rows: prepare(bands.pocket), empty: `Пока ни одна машина не укладывается в ${rub(amount)}.` },
    {
      id: "soon",
      title: "Через 1–4 месяца",
      rows: prepare(bands.soon),
      empty:
        data.monthly > 0
          ? "За 1–4 месяца при текущем взносе новая машина без пометки «не брать» не открывается."
          : "Укажи ежемесячный взнос в копилке — здесь появятся машины, до которых 1–4 месяца.",
    },
    { id: "skip", title: "В бюджете, но не бери", rows: prepare(bands.skip), empty: "В этой сумме нет машин с пометкой «не брать»." },
    { id: "later", title: "Дальше", rows: prepare(bands.later), empty: "Дальше по каталогу машин нет." },
  ].filter((group) => (view === "mine" ? group.id === "pocket" || group.id === "skip" : true));

  const visibleTraps = useMemo(() => trapsFor(traps, amount), [traps, amount]);

  function toggleSort(key: keyof typeof sorts) {
    const nextDir = sort === key && dir === "desc" ? "asc" : "desc";
    setSort(key);
    setDir(nextDir);
    writeUrl({ sort: key, dir: nextDir });
  }

  if (!ready) return <Skeleton className="h-80" />;

  return (
    <div className="space-y-6">
      <p className="text-sm">
        У тебя <span className="num font-semibold">{rub(amount)}</span>. Группы считаются от этой суммы, без округления до отметки.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Подборка"
          value={view}
          onChange={(id) => {
            setView(id);
            writeUrl({ view: id });
          }}
          options={[
            { id: "all", label: "Все" },
            { id: "mine", label: "В бюджете" },
            { id: "goal", label: "Цель" },
          ]}
        />
        <button type="button" className="inline-flex h-10 items-center gap-2 rounded-full bg-canvas-secondary px-4 text-sm" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal size={16} strokeWidth={1.5} aria-hidden="true" />
          Фильтры
        </button>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {(["score", "price", "mileage", "year"] as const).map((key) => (
          <button key={key} type="button" className="rounded-full bg-canvas-secondary px-3 py-2" onClick={() => toggleSort(key)}>
            {sorts[key]}
            {sort === key ? (dir === "desc" ? " ↓" : " ↑") : ""}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">
        Данные за {items[0]?.month ?? "—"}. Уверенность: {items[0] ? labels.confidence[items[0].confidence] : "—"}.
        {items.every((item) => item.isSeed) ? " Это стартовые ориентиры, не подсчёт объявлений." : ""}
      </p>

      {groups.map((group) => (
        <section key={group.id} className="space-y-3">
          <h2 className="text-lg font-semibold">{group.title}</h2>
          {group.rows.length === 0 ? (
            <p className="text-sm text-muted">{group.empty}</p>
          ) : (
            <ul className="space-y-3">
              {group.rows.map((item) => {
                const advice = adviceBySlug.get(item.slug) ?? null;
                const gap = realPrice(item.median, item.hp, data.driver) - amount;
                const status = priceStatus(item);
                return (
                  <li key={item.slug} className="card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <label className="mr-2">
                          <input
                            type="checkbox"
                            checked={picked.includes(item.slug)}
                            aria-label={`Сравнить ${displayName(item)}`}
                            onChange={() =>
                              setPicked((current) =>
                                current.includes(item.slug) ? current.filter((slug) => slug !== item.slug) : current.length >= 3 ? current : [...current, item.slug],
                              )
                            }
                          />
                        </label>
                        <Link href={`/cars/${item.slug}`} className="font-medium">
                          {displayName(item)}
                        </Link>
                        <div className="text-xs text-muted">
                          {item.generation}, {labels.bodies[item.body]}
                        </div>
                      </div>
                      <ScorePill score={item.score} />
                    </div>
                    {advice ? (
                      <div className="mt-2">
                        <AdviceMark
                          advice={advice}
                          items={links}
                          open={openSign === item.slug}
                          onToggle={() => setOpenSign((current) => (current === item.slug ? null : item.slug))}
                        />
                      </div>
                    ) : null}
                    <p className="mt-2 text-sm text-muted">
                      {rub(item.median)}
                      {gap > 0 ? ` · ещё ${approxRub(gap)}` : ""} · {item.medianYear} · {item.medianMileageKm.toLocaleString("ru-RU")} км
                    </p>
                    {status.length ? <p className="mt-1 text-sm text-muted">{status.join(" · ")}</p> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}

      {visibleTraps.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Не рекомендуем в бюджете {rub(amount)}</h2>
          <ul className="space-y-3">
            {visibleTraps.map((trap) => {
              const instead = trap.insteadSlugs
                .map((slug) => links.find((link) => link.slug === slug))
                .filter((link): link is ModelLink => Boolean(link));
              return (
                <li key={trap.id} className="card space-y-2 p-4">
                  <div className="flex items-start gap-3">
                    <Sign verdict={trap.verdict} />
                    <div>
                      <p className="font-medium">{trap.title}</p>
                      <p className="text-sm text-muted">{labels.advice[trap.verdict]}</p>
                    </div>
                  </div>
                  <p className="text-sm">{trap.reason}</p>
                  <p className="text-sm text-muted">Как узнать: {trap.howToSpot}</p>
                  {instead.length ? (
                    <p className="text-sm">
                      Вместо неё:{" "}
                      {instead.map((link, index) => (
                        <span key={link.slug}>
                          {index ? ", " : ""}
                          <Link href={`/cars/${link.slug}`}>{displayName(link)}</Link>
                        </span>
                      ))}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {items.some((item) => item.median > TIER_MAX) ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Пока вне бюджета</h2>
          <ul className="space-y-2 text-sm">
            {items
              .filter((item) => item.median > TIER_MAX)
              .map((item) => (
                <li key={item.slug}>
                  <Link href={`/cars/${item.slug}`}>{displayName(item)}</Link>
                  <span className="text-muted"> — медиана {rub(item.median)}</span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {pending.length ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Цены пока нет</h2>
          <ul className="space-y-2 text-sm">
            {pending.map((item) => (
              <li key={item.slug}>
                <Link href={`/cars/${item.slug}`}>
                  {item.brand} {item.model}
                </Link>
                <span className="text-muted"> — снимок ещё не прошёл проверку</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {picked.length >= 2 ? (
        <Link href={`/compare?m=${picked.join(",")}`} className="inline-flex h-12 items-center rounded-full bg-accent px-5 font-medium text-accent-ink no-underline">
          Сравнить {picked.length}
        </Link>
      ) : null}

      <Sheet open={filtersOpen} title="Фильтры" onClose={() => setFiltersOpen(false)}>
        <div className="space-y-3">
          <button
            type="button"
            className="block w-full rounded-2xl bg-canvas-secondary px-4 py-3 text-left"
            onClick={() => {
              setBody("");
              writeUrl({ body: "" });
              setFiltersOpen(false);
            }}
          >
            Все кузова
          </button>
          {Object.entries(labels.bodies).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="block w-full rounded-2xl bg-canvas-secondary px-4 py-3 text-left"
              onClick={() => {
                setBody(id);
                writeUrl({ body: id });
                setFiltersOpen(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
