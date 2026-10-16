import { ScorePill } from "@/components/domain/score-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { catalog } from "@/lib/data";
import { labels } from "@/lib/content";
import { rub } from "@/lib/format";
import { realPrice } from "@/lib/meta";
import { displayName, findModel } from "@/lib/market";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Сравнение" };

export default function ComparePage({ searchParams }: { searchParams: Promise<{ m?: string | string[] }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <CompareTable searchParams={searchParams} />
    </Suspense>
  );
}

async function CompareTable({ searchParams }: { searchParams: Promise<{ m?: string | string[] }> }) {
  const params = await searchParams;
  const raw = Array.isArray(params.m) ? params.m.join(",") : (params.m ?? "");
  const picked = raw
    .split(",")
    .map((slug) => findModel(catalog, slug))
    .filter((item) => item !== undefined)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <h1 className="text-[2rem] leading-tight font-semibold">Сравнение</h1>
      {picked.length < 2 ? (
        <p className="text-sm">
          Отметьте 2–3 машины в <Link href="/cars">каталоге</Link>. Ссылка выглядит так: /compare?m=hyundai-solaris-1,kia-rio-3
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="site-table">
            <caption className="sr-only">Сравнение выбранных моделей</caption>
            <thead>
              <tr>
                <th scope="col"> </th>
                {picked.map((item) => (
                  <th scope="col" key={item.slug}>
                    <Link href={`/cars/${item.slug}`}>{displayName(item)}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Оценка</th>
                {picked.map((item) => (
                  <td key={item.slug}>
                    <ScorePill score={item.score} />
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Медиана</th>
                {picked.map((item) => (
                  <td key={item.slug} className="num">
                    {rub(item.median)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">К покупке</th>
                {picked.map((item) => (
                  <td key={item.slug} className="num">
                    {rub(realPrice(item.median, item.hp))}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Пробег</th>
                {picked.map((item) => (
                  <td key={item.slug}>{item.medianMileageKm.toLocaleString("ru-RU")} км</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Коробка</th>
                {picked.map((item) => (
                  <td key={item.slug}>{labels.verdict[item.bestGearbox]}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
