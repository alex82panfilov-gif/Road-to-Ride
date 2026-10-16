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
