import { Card } from "@/components/ui/card";
import { labels } from "@/lib/content";
import { km, rub } from "@/lib/format";
import { displayName, type TierComparison } from "@/lib/market";

export function TierDelta({ comparison }: { comparison: TierComparison }) {
  if (!comparison.nextBudget) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">Дальше по шкале пусто</h2>
        <p className="mt-2 text-sm text-muted">Вы на верхней отметке каталога, 1 000 000 ₽.</p>
      </Card>
    );
  }

  if (!comparison.next) {
    return (
      <Card>
        <p className="text-sm text-muted">+50 000 = ?</p>
        <h2 className="mt-1 text-lg font-semibold">Следующий уровень — {rub(comparison.nextBudget)}</h2>
        <p className="mt-3 text-sm">На этой отметке машины ещё нет. Первая в каталоге дороже, так что пока просто копим.</p>
      </Card>
    );
  }

  const score = comparison.scoreDelta;
  const parts = [`${score > 0 ? "+" : ""}${score.toFixed(1).replace(".", ",")} балла`];
  if (comparison.gearboxImproved) parts.push("автомат станет надёжнее");
  if (comparison.mileageDelta >= 10_000) parts.push(`пробег в среднем на ${km(comparison.mileageDelta)} меньше`);
  if (score <= 0) parts.splice(0, parts.length, "оценка почти не растёт, ждать ради балла необязательно");

  return (
    <Card>
      <p className="text-sm text-muted">+50 000 = ?</p>
      <h2 className="mt-1 text-lg font-semibold">Следующий уровень через 50 000 ₽</h2>
      <p className="mt-3 text-sm">{parts.join(", ")}.</p>
      <p className="mt-2 text-sm text-muted">
        Сейчас: {comparison.current ? `${displayName(comparison.current)}, ${comparison.current.score.toFixed(1).replace(".", ",")} · ${labels.verdict[comparison.current.bestGearbox]}` : "в каталоге ещё пусто"}.
        Дальше: {displayName(comparison.next)}, {rub(comparison.next.median)}.
      </p>
    </Card>
  );
}
