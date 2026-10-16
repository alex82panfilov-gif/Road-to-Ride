"use client";

import { Sheet } from "@/components/ui/sheet";
import type { CatalogItem } from "@/lib/market";
import type { DriverProfile } from "@/lib/meta";
import { goalGroups, goalLabel } from "@/lib/view/goals";
import { useId, useMemo, useState, type KeyboardEvent } from "react";

export function GoalPicker({
  items,
  saved,
  monthly,
  inflation,
  driver,
  value,
  onChange,
  id,
}: {
  items: CatalogItem[];
  saved: number;
  monthly: number;
  inflation: number;
  driver: DriverProfile;
  value: string | null;
  onChange: (slug: string | null) => void;
  id?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const groups = useMemo(() => goalGroups(items, saved, monthly, inflation, driver), [items, saved, monthly, inflation, driver]);
  const selected = items.find((item) => item.slug === value) ?? null;
  const needle = query.trim().toLowerCase();
  const visible = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => `${item.brand} ${item.model} ${item.generation}`.toLowerCase().includes(needle)),
    }))
    .filter((group) => group.items.length);
  const flat = visible.flatMap((group) => group.items);

  function choose(slug: string | null) {
    onChange(slug);
    setQuery("");
    setOpen(false);
    setSheet(false);
  }

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(flat.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const next = flat[active];
      if (next) choose(next.slug);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div id={id} tabIndex={-1}>
      <button type="button" className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4 text-left md:hidden" onClick={() => setSheet(true)}>
        {selected ? goalLabel(selected, driver) : "Не выбрана"}
      </button>
      <div className="relative mt-1 hidden md:block">
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && flat[active] ? `${listId}-${flat[active].slug}` : undefined}
          className="h-12 w-full rounded-2xl bg-canvas-secondary px-4"
          placeholder="Найти машину"
          value={open ? query : selected ? goalLabel(selected, driver) : ""}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKey}
        />
        {open ? (
          <ul id={listId} role="listbox" className="card absolute z-20 mt-2 max-h-80 w-full overflow-auto p-2">
            <li>
              <button type="button" className="w-full rounded-xl px-3 py-2 text-left text-sm" onClick={() => choose(null)}>
                Не выбрана
              </button>
            </li>
            {visible.map((group) => (
              <li key={group.id}>
                <p className={`px-3 pt-3 text-xs font-medium ${group.id === "avoid" ? "text-muted" : ""}`}>{group.title}</p>
                <ul>
                  {group.items.map((item) => {
                    const index = flat.findIndex((entry) => entry.slug === item.slug);
                    return (
                      <li key={item.slug} id={`${listId}-${item.slug}`} role="option" aria-selected={item.slug === value}>
                        <button
                          type="button"
                          className={`w-full rounded-xl px-3 py-2 text-left text-sm ${index === active ? "bg-canvas-secondary" : ""} ${group.id === "avoid" ? "text-muted" : ""}`}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setActive(index)}
                          onClick={() => choose(item.slug)}
                        >
                          {goalLabel(item, driver)}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
            {flat.length === 0 ? <li className="px-3 py-2 text-sm text-muted">Ничего не нашлось</li> : null}
          </ul>
        ) : null}
      </div>
      <Sheet open={sheet} title="Машина-цель" onClose={() => setSheet(false)}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Найти машину"
          aria-label="Найти машину"
          className="h-12 w-full rounded-2xl bg-canvas-secondary px-4"
        />
        <div className="mt-4 space-y-4">
          <button type="button" className="text-sm" onClick={() => choose(null)}>
            Не выбрана
          </button>
          {visible.map((group) => (
            <section key={group.id} className={group.id === "avoid" ? "text-muted" : ""}>
              <h3 className="text-sm font-medium">{group.title}</h3>
              <ul className="mt-2 space-y-1">
                {group.items.map((item) => (
                  <li key={item.slug}>
                    <button type="button" className="w-full rounded-xl px-2 py-2 text-left text-sm" onClick={() => choose(item.slug)}>
                      {goalLabel(item, driver)}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
