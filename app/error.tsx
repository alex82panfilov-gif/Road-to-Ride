"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-4">
      <h1 className="text-[2rem] font-semibold">Страница не открылась</h1>
      <button type="button" onClick={reset} className="h-12 rounded-full bg-accent px-5 font-medium text-accent-ink">
        Попробовать снова
      </button>
    </div>
  );
}
