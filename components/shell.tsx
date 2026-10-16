"use client";

import { useUi, useUser } from "@/components/providers";
import { labels } from "@/lib/content";
import { meta } from "@/lib/meta";
import { displayName, type CatalogItem } from "@/lib/market";
import { formatDay } from "@/lib/format";
import { BookOpen, Car, House, PiggyBank, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const icons = [House, Car, PiggyBank, BookOpen];

export function Shell({ items, children }: { items: CatalogItem[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, update } = useUser();
  const { setDepositOpen, setSearchOpen, searchOpen } = useUi();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && event.target.closest("input, textarea, select");
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "/") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.code === "KeyN") {
        event.preventDefault();
        setDepositOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDepositOpen, setSearchOpen]);

  return (
    <>
      <a href="#content" className="skip-link">
        К содержимому
      </a>
      <header className="bar-blur sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4">
          <Link href="/" className="font-semibold text-ink no-underline">
            {labels.siteName}
          </Link>
          <nav className="ml-4 hidden items-center gap-4 text-sm md:flex" aria-label="Разделы">
            {labels.nav.map((item) => (
              <Link key={item.href} href={item.href} className={pathname === item.href ? "font-semibold text-ink no-underline" : "text-muted no-underline"} aria-current={pathname === item.href ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="rounded-full px-3 py-2 text-sm text-muted" onClick={() => update((current) => ({ ...current, mode: current.mode === "beginner" ? "expert" : "beginner" }))}>
              {data.mode === "expert" ? "Знаток" : "Новичок"}
            </button>
            <button
              type="button"
              className="rounded-full px-3 py-2 text-sm text-muted"
              onClick={() => update((current) => ({ ...current, theme: current.theme === "system" ? "dark" : current.theme === "dark" ? "light" : "system" }))}
            >
              {data.theme === "dark" ? "Тёмная" : data.theme === "light" ? "Светлая" : "Как в системе"}
            </button>
            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-canvas-secondary" aria-label="Поиск по моделям" onClick={() => setSearchOpen(true)}>
              <Search size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>
      {!online ? (
        <p className="bg-canvas-secondary px-4 py-2 text-center text-sm">Нет сети. Данные от {formatDay(meta.updatedAt)}, копилка работает.</p>
      ) : null}
      <main id="content" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-28 md:pb-16">
        {children}
      </main>
      <footer className="mx-auto max-w-5xl space-y-3 px-4 pb-28 text-sm text-muted md:pb-10">
        <p>{meta.disclaimer}</p>
        <p>
          <Link href="/method">Как считается</Link>
          {" · "}
          <Link href="/privacy">Что хранится</Link>
          {" · "}
          <Link href="/changelog">Что изменилось</Link>
        </p>
      </footer>
      <nav className="bar-blur fixed inset-x-0 bottom-0 z-30 border-t border-line md:hidden" aria-label="Разделы">
        <ul className="grid grid-cols-4">
          {labels.nav.map((item, index) => {
            const Icon = icons[index];
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link href={item.href} className={`flex flex-col items-center gap-1 py-2 text-xs no-underline ${active ? "text-accent" : "text-muted"}`} aria-current={active ? "page" : undefined}>
                  <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <SearchDialog open={searchOpen} items={items} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function SearchDialog({ open, items, onClose }: { open: boolean; items: CatalogItem[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const found = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items.slice(0, 8);
    return items.filter((item) => `${item.brand} ${item.model} ${item.generation}`.toLowerCase().includes(needle)).slice(0, 8);
  }, [items, query]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Закрыть поиск" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Поиск по моделям" className="card absolute top-20 left-1/2 w-[min(560px,calc(100%-32px))] -translate-x-1/2 p-4">
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Модель"
          aria-label="Модель"
          className="h-12 w-full rounded-2xl bg-canvas-secondary px-4"
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "Enter" && found[0]) {
              router.push(`/cars/${found[0].slug}`);
              onClose();
            }
          }}
        />
        <ul className="mt-3">
          {found.map((item) => (
            <li key={item.slug}>
              <Link href={`/cars/${item.slug}`} onClick={onClose} className="block rounded-xl px-3 py-2 text-ink no-underline hover:bg-canvas-secondary">
                {displayName(item)} <span className="text-muted">{item.generation}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
