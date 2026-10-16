"use client";

import { useUser } from "@/components/providers";
import { Skeleton } from "@/components/ui/skeleton";
import { displayName } from "@/lib/market";

export function ChecklistView({ item, points }: { item: { slug: string; brand: string; model: string }; points: string[] }) {
  const { ready, data, update } = useUser();
  if (!ready) return <Skeleton className="h-64" />;
  const state = data.checklists[item.slug] ?? { checked: [], notes: {} };
  const done = points.filter((point) => state.checked.includes(point)).length;

  function toggle(point: string) {
    update((current) => {
      const prev = current.checklists[item.slug] ?? { checked: [], notes: {} };
      const checked = prev.checked.includes(point) ? prev.checked.filter((itemPoint) => itemPoint !== point) : [...prev.checked, point];
      return { ...current, checklists: { ...current.checklists, [item.slug]: { ...prev, checked } } };
    });
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[2rem] leading-tight font-semibold">Осмотр: {displayName(item)}</h1>
        <p className="mt-2 text-sm text-muted">
          Отмечено {done} из {points.length}. Галочки остаются в телефоне и доступны без сети, если страница уже открывалась.
        </p>
      </header>
      <ul className="space-y-3">
        {points.map((point) => {
          const checked = state.checked.includes(point);
          return (
            <li key={point} className="card p-4">
              <label className="flex items-start gap-4 text-lg">
                <input type="checkbox" checked={checked} onChange={() => toggle(point)} className="mt-1 h-7 w-7" />
                <span>{point}</span>
              </label>
              <label className="mt-3 block text-sm text-muted">
                Заметка
                <input
                  value={state.notes[point] ?? ""}
                  onChange={(event) =>
                    update((current) => {
                      const prev = current.checklists[item.slug] ?? { checked: [], notes: {} };
                      return {
                        ...current,
                        checklists: {
                          ...current.checklists,
                          [item.slug]: { ...prev, notes: { ...prev.notes, [point]: event.target.value } },
                        },
                      };
                    })
                  }
                  className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4 text-base text-ink"
                />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
