"use client";

import { ScorePill } from "@/components/domain/score-pill";
import { useUser } from "@/components/providers";
import { Sheet } from "@/components/ui/sheet";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { labels } from "@/lib/content";
import { rub } from "@/lib/format";
import { displayName, firstPricedTier, type CatalogItem } from "@/lib/market";
import { TIER_MAX, TIER_MIN, TIER_STEP } from "@/lib/tiers";
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

export function CatalogBrowser({ items, pending = [] }: { items: CatalogItem[]; pending?: { slug: string; brand: string; model: string }[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { saved, data, ready: userReady } = useUser();
  const [budget, setBudget] = useState(TIER_MIN * 3 + TIER_STEP);
  const [body, setBody] = useState("");
  const [sort, setSort] = useState<keyof typeof sorts>("score");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!userReady) return;
    const rawBudget = params.get("budget");
    const fromUrl = Number(rawBudget);
    if (rawBudget && Number.isFinite(fromUrl)) setBudget(clampBudget(fromUrl));
    else setBudget(saved > 0 ? clampBudget(saved) : firstPricedTier(items));
    const nextBody = params.get("body") ?? "";
    setBody(nextBody in labels.bodies ? nextBody : "");
    const nextSort = params.get("sort");
    if (nextSort && nextSort in sorts) setSort(nextSort as keyof typeof sorts);
    setDir(params.get("dir") === "asc" ? "asc" : "desc");
    const nextView = params.get("view");
    setView(nextView === "mine" || nextView === "goal" ? nextView : "all");
    setReady(true);
  }, [params, userReady, saved, items]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select")) return;
      if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") return;
      event.preventDefault();
      const delta = event.code === "ArrowRight" ? TIER_STEP : -TIER_STEP;
      const next = clampBudget(budget + delta);
      setBudget(next);
      writeUrl({ budget: next });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function writeUrl(next: { budget?: number; body?: string; sort?: keyof typeof sorts; dir?: "asc" | "desc"; view?: string }) {
    const query = new URLSearchParams(params.toString());
    query.set("budget", String(next.budget ?? budget));
    const bodyValue = next.body ?? body;
    if (bodyValue) query.set("body", bodyValue);
    else query.delete("body");
    query.set("sort", next.sort ?? sort);
    query.set("dir", next.dir ?? dir);
    query.set("view", next.view ?? view);
    router.push(`${pathname}?${query.toString()}`);
  }

  const rows = useMemo(() => {
    const limit = view === "mine" ? Math.min(budget, saved) : budget;
    return items
      .filter((item) => (view === "goal" ? item.slug === data.goalSlug : item.median <= limit))
      .filter((item) => (body ? item.body === body : true))
      .sort((a, b) => {
        const factor = dir === "asc" ? 1 : -1;
        const left = sort === "score" ? a.score : sort === "price" ? a.median : sort === "mileage" ? a.medianMileageKm : a.medianYear;
        const right = sort === "score" ? b.score : sort === "price" ? b.median : sort === "mileage" ? b.medianMileageKm : b.medianYear;
        return (left - right) * factor;
      });
  }, [items, view, budget, saved, data.goalSlug, body, sort, dir]);

  function toggleSort(key: keyof typeof sorts) {
    const nextDir = sort === key && dir === "desc" ? "asc" : "desc";
    setSort(key);
    setDir(nextDir);
    writeUrl({ sort: key, dir: nextDir });
  }

  if (!ready) return <Skeleton className="h-80" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Подборка"
          value={view}
          onChange={(id) => {
            setView(id);
            if (id === "mine") {
              const next = clampBudget(saved || budget);
              setBudget(next);
              writeUrl({ view: id, budget: next });
            } else writeUrl({ view: id });
          }}
          options={[
            { id: "all", label: "Все" },
            { id: "mine", label: "Доступно мне" },
            { id: "goal", label: "Цель" },
          ]}
        />
        <button type="button" className="inline-flex h-10 items-center gap-2 rounded-full bg-canvas-secondary px-4 text-sm" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal size={16} strokeWidth={1.5} aria-hidden="true" />
          Фильтры
        </button>
      </div>

      <label className="block">
        <span className="text-sm text-muted">Бюджет</span>
        <span className="relative mt-8 block">
          <span
            className="pointer-events-none absolute -top-7 -translate-x-1/2 text-sm font-medium whitespace-nowrap"
            style={{ left: `${((budget - TIER_MIN) / (TIER_MAX - TIER_MIN)) * 100}%` }}
          >
            {rub(budget)}
          </span>
          <input
            type="range"
            min={TIER_MIN}
            max={TIER_MAX}
            step={TIER_STEP}
            value={budget}
            aria-valuetext={rub(budget)}
            onChange={(event) => setBudget(clampBudget(Number(event.target.value)))}
            onPointerUp={(event) => {
              const next = clampBudget(Number(event.currentTarget.value));
              setBudget(next);
              writeUrl({ budget: next, view: "all" });
            }}
            onKeyUp={(event) => {
              const next = clampBudget(Number(event.currentTarget.value));
              setBudget(next);
              writeUrl({ budget: next });
            }}
            className="w-full accent-[var(--accent)]"
          />
        </span>
        <span className="mt-1 flex justify-between text-xs text-muted">
          <span>150 тыс</span>
          <span>500 тыс</span>
          <span>1 млн</span>
        </span>
      </label>

      <p className="text-sm text-muted">
        Данные за {items[0]?.month ?? "—"}. Уверенность: {items[0] ? labels.confidence[items[0].confidence] : "—"}.
        {items.every((item) => item.isSeed) ? " Это стартовые ориентиры, не подсчёт объявлений." : ""}
      </p>

      {rows.length === 0 ? (
        <div className="card space-y-3 p-6 text-sm">
          {view === "all" && !body ? (
            <>
              <p>
                За {rub(budget)} машин с автоматом нет. Ближайшие от {rub(Math.min(...items.map((item) => item.median)))}.
              </p>
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-full bg-accent px-4 font-medium text-accent-ink"
                onClick={() => {
                  const next = firstPricedTier(items);
                  setBudget(next);
                  writeUrl({ budget: next, view: "all" });
                }}
              >
                Показать
              </button>
            </>
          ) : (
            <p>В этом сочетании фильтров машин нет. Сдвиньте бюджет или сбросьте кузов.</p>
          )}
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <table className="site-table">
              <caption className="sr-only">Каталог машин с автоматической коробкой</caption>
              <thead>
                <tr>
                  <th scope="col">Модель</th>
                  {(["score", "price", "mileage", "year"] as const).map((key) => (
                    <th scope="col" key={key}>
                      <button type="button" onClick={() => toggleSort(key)} className="font-semibold">
                        {sorts[key]}
                        {sort === key ? (dir === "desc" ? " ↓" : " ↑") : ""}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="transition-opacity duration-200">
                {rows.map((item) => (
                  <tr key={item.slug}>
                    <td>
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
                    </td>
                    <td>
                      <ScorePill score={item.score} />
                    </td>
                    <td className="num">{rub(item.median)}</td>
                    <td className="num">{item.medianMileageKm.toLocaleString("ru-RU")}</td>
                    <td className="num">{item.medianYear}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {rows.map((item) => (
              <li key={item.slug} className="card p-4 transition-opacity duration-200">
                <Link href={`/cars/${item.slug}`} className="font-medium">
                  {displayName(item)}
                </Link>
                <div className="mt-1">
                  <ScorePill score={item.score} />
                </div>
                <p className="mt-2 text-sm text-muted">
                  {rub(item.median)} · {item.medianYear} · {item.medianMileageKm.toLocaleString("ru-RU")} км
                </p>
                {item.isFallback ? <p className="mt-1 text-sm text-muted">В этом месяце мало объявлений, показана цена за {item.month}.</p> : null}
              </li>
            ))}
          </ul>
        </>
      )}

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
        <Link href={`/compare?m=${picked.join(",")}`} className="inline-flex h-12 items-center rounded-full bg-accent px-5 font-medium text-accent-ink">
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

function clampBudget(value: number): number {
  const stepped = Math.round(value / TIER_STEP) * TIER_STEP;
  return Math.min(TIER_MAX, Math.max(TIER_MIN, stepped));
}
