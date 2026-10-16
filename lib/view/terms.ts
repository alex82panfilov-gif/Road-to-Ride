export type TermPart = { text: string; href?: string };

const rules: { pattern: RegExp; id: string }[] = [
  { pattern: /PowerShift|DSG/gi, id: "dsg" },
  { pattern: /вариатор\p{L}*/giu, id: "cvt" },
  { pattern: /АКПП/gi, id: "at" },
  { pattern: /АМТ/gi, id: "amt" },
  { pattern: /КБМ/gi, id: "kbm" },
  { pattern: /ПТС|СТС/gi, id: "pts" },
  { pattern: /VIN/g, id: "vin" },
  { pattern: /медиан\p{L}*/giu, id: "median" },
  { pattern: /резерв\p{L}*/giu, id: "reserve" },
];

/** Делит текст на обычные куски и слова, которые есть в словаре. */
export function termParts(text: string): TermPart[] {
  const hits: { start: number; end: number; id: string }[] = [];
  for (const rule of rules) {
    for (const match of text.matchAll(rule.pattern)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (hits.some((hit) => start < hit.end && end > hit.start)) continue;
      hits.push({ start, end, id: rule.id });
    }
  }
  hits.sort((left, right) => left.start - right.start);
  const parts: TermPart[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start < cursor) continue;
    if (hit.start > cursor) parts.push({ text: text.slice(cursor, hit.start) });
    parts.push({ text: text.slice(hit.start, hit.end), href: `/guide/glossary#${hit.id}` });
    cursor = hit.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts.length ? parts : [{ text }];
}
