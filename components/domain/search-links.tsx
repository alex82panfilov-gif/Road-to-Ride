import type { SearchLinksResult } from "@/lib/view/search";

export function SearchLinks({ autoHref, dromHref, autoLabel, dromLabel }: { autoHref: string; dromHref: string; autoLabel: string; dromLabel: string }) {
  return (
    <p className="text-sm">
      <a className="font-medium" href={autoHref} target="_blank" rel="noopener">
        {autoLabel}
      </a>
      {" · "}
      <a className="font-medium" href={dromHref} target="_blank" rel="noopener">
        {dromLabel}
      </a>
    </p>
  );
}

export function MarketSearch({ result }: { result: SearchLinksResult }) {
  return (
    <div className="space-y-2 text-sm">
      <SearchLinks autoHref={result.links.autoru} dromHref={result.links.drom} autoLabel="Искать на auto.ru" dromLabel="Искать на Drom" />
      <p className="text-muted">{result.caption}</p>
      {result.savings.kind === "links" ? (
        <p>
          {result.savings.label}
          {": "}
          <a className="font-medium" href={result.savings.links.autoru} target="_blank" rel="noopener">
            auto.ru
          </a>
          {" · "}
          <a className="font-medium" href={result.savings.links.drom} target="_blank" rel="noopener">
            Drom
          </a>
        </p>
      ) : null}
      {result.savings.kind === "note" ? <p>{result.savings.text}</p> : null}
    </div>
  );
}
