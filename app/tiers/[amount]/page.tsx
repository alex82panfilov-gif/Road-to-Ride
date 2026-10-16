import { ScoreChart } from "@/components/domain/score-chart";
import { ScorePill } from "@/components/domain/score-pill";
import { TierDelta } from "@/components/domain/tier-delta";
import { Card } from "@/components/ui/card";
import { catalog } from "@/lib/data";
import { rub } from "@/lib/format";
import { realPrice } from "@/lib/meta";
import { affordableAt, displayName, sweetSpotAmounts } from "@/lib/market";
import { isTierAmount, levelForAmount, tierAmounts } from "@/lib/tiers";
import { bestSafeAt, compareSafeTiers } from "@/lib/view/market";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ amount: string }> };

export function generateStaticParams() {
  return tierAmounts().map((amount) => ({ amount: String(amount) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { amount } = await params;
  const value = Number(amount);
  if (!isTierAmount(value)) return { title: "Уровень" };
  return { title: `Что можно купить за ${rub(value)}` };
}

export default async function TierPage({ params }: Props) {
  const { amount } = await params;
  const budget = Number(amount);
  if (!isTierAmount(budget)) notFound();
  const cars = affordableAt(catalog, budget);
  const best = bestSafeAt(catalog, budget);
  const steps = tierAmounts().map((amount) => {
    const car = bestSafeAt(catalog, amount);
    return { amount, level: levelForAmount(amount), best: car, score: car?.score ?? 0 };
  });
  const amounts = tierAmounts();
  const index = amounts.indexOf(budget);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[2rem] leading-tight font-semibold">Что можно купить за {rub(budget)}</h1>
        <p className="mt-2 text-sm text-muted">
          Уровень {index + 1} из {amounts.length}. Показаны модели, чья медиана укладывается в сумму.
        </p>
      </header>
      {best ? (
        <Card>
          <p className="text-sm text-muted">Лучшая оценка на этом уровне</p>
          <h2 className="mt-1 text-xl font-semibold">
            <Link href={`/cars/${best.slug}`}>{displayName(best)}</Link>
          </h2>
          <ScorePill score={best.score} />
          <p className="mt-2 text-sm">К покупке, с ОСАГО и резервом: {rub(realPrice(best.median, best.hp))}.</p>
        </Card>
      ) : (
        <p>За эту сумму в каталоге ещё нет машины с автоматом.</p>
      )}
      <TierDelta comparison={compareSafeTiers(catalog, budget)} />
      <ul className="space-y-3">
        {cars.map((item) => (
          <li key={item.slug} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <Link href={`/cars/${item.slug}`} className="font-medium">
              {displayName(item)}
            </Link>
            <span className="text-sm text-muted">{rub(item.median)}</span>
            <ScorePill score={item.score} />
          </li>
        ))}
      </ul>
      <ScoreChart steps={steps} marks={sweetSpotAmounts(catalog)} />
      <p className="flex justify-between text-sm">
        {index > 0 ? <Link href={`/tiers/${amounts[index - 1]}`}>На {rub(amounts[index - 1])}</Link> : <span />}
        {index < amounts.length - 1 ? <Link href={`/tiers/${amounts[index + 1]}`}>На {rub(amounts[index + 1])}</Link> : <span />}
      </p>
    </div>
  );
}
