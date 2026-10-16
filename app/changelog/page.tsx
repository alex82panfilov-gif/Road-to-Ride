import { snapshotFiles } from "@/lib/data";
import { formatMonth } from "@/lib/format";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Что изменилось" };

export default function ChangelogPage() {
  const entries = [...snapshotFiles].reverse().filter((file) => !file.seed && file.changelog);
  return (
    <div className="space-y-6">
      <h1 className="text-[2rem] leading-tight font-semibold">Что изменилось</h1>
      {entries.length === 0 ? <p>Журнал появится после первого проверенного снимка. Стартовые ориентиры в историю цен не входят.</p> : null}
      {entries.map((entry) => (
        <article key={entry.month} className="space-y-2">
          <h2 className="text-xl font-semibold">{formatMonth(entry.month)}</h2>
          <p>{entry.changelog}</p>
          <p className="text-sm text-muted">{entry.marketSummary.trend}</p>
          {entry.flags.length ? (
            <ul className="text-sm text-warning">
              {entry.flags.map((flag) => (
                <li key={`${flag.slug}-${flag.issue}`}>
                  {flag.slug}: {flag.issue}
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
}
