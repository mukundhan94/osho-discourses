// What a set of rows adds up to: counts, towns, the summary sentence. Small helpers
// that the year and series pages share.
import type { Row } from "../data/index.ts";
import { compare } from "../data/errors.ts";

export const KIND_LABEL: Partial<Record<Row["kind"], string>> = {
  camp: "Meditation camp",
  darshan: "Darshan diary",
  interview: "Press interviews",
};
export const LANG_NAME = { "": "", hi: "Hindi", en: "English" } as const;
export const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];

/** The first number in a talks cell: 12 for "12", "about 12" and "at least 12"; undefined for "unknown". */
export function talkNumber(text: string): number | undefined {
  const m = /\d+/.exec(text);
  return m ? Number(m[0]) : undefined;
}

/** "talk", "talks", or nothing when the cell holds no number. The stylesheet prints it on phones. */
export function unitFor(talks: string): string {
  const n = talkNumber(talks);
  return n === undefined ? "" : n === 1 ? "talk" : "talks";
}

/** The month a row starts in, 1 to 12, or 0 when its sort key names none. */
export function monthOf(row: Row): number {
  const m = /^\d{4}-(\d{2})/.exec(row.sort);
  return m && m[1] !== "00" ? Number(m[1]) : 0;
}

/** The talks that have a number, summed, and how many rows have no firm count. */
export function totals(rows: Row[]): { known: number; open: number } {
  const known = rows.reduce((sum, r) => sum + (talkNumber(r.talks) ?? 0), 0);
  const open = rows.filter((r) => !/^\d+$/.test(r.talks.trim())).length;
  return { known, open };
}

export type TownWeights = {
  /** Talks per town, in the order towns first appear. A row with several towns is shared between them. */
  weight: Map<string, number>;
  camps: Set<string>;
  /** Towns by weight, heaviest first; camps before others on a tie, then by name. */
  ranked: string[];
};

export function townWeights(rows: Row[]): TownWeights {
  const weight = new Map<string, number>();
  const camps = new Set<string>();
  for (const r of rows) {
    const n = talkNumber(r.talks) || 1;
    for (const t of r.townList) {
      weight.set(t, (weight.get(t) ?? 0) + n / r.townList.length);
      if (r.kind === "camp") camps.add(t);
    }
  }
  const ranked = [...weight.keys()].sort(
    (a, b) => weight.get(b)! - weight.get(a)! || Number(!camps.has(a)) - Number(!camps.has(b)) || compare(a, b),
  );
  return { weight, camps, ranked };
}

/** The sentence under a year's towns, and whether the rows mix languages. */
export function summaryFor(rows: Row[]): { text: string; showLang: boolean } {
  const { known, open } = totals(rows);
  const towns = new Set(rows.flatMap((r) => r.townList)).size;
  const camps = rows.filter((r) => r.kind === "camp").length;
  const n = rows.length;
  let text = `${n} entr${n === 1 ? "y" : "ies"} and ${known} counted talk${known === 1 ? "" : "s"} in ${towns} place${towns === 1 ? "" : "s"}.`;
  if (camps) text += ` ${camps} meditation camp${camps !== 1 ? "s" : ""}.`;
  if (open) text += ` ${open} entr${open === 1 ? "y has" : "ies have"} no firm count.`;
  const langs = new Set(rows.map((r) => r.lang).filter(Boolean));
  if (langs.size === 1 && langs.has("hi")) text += " All in Hindi.";
  else if (langs.size === 1 && langs.has("en")) text += " All in English.";
  return { text, showLang: langs.size > 1 };
}
