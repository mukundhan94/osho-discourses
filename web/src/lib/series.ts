// The words on a series page that are worked out from its rows: its title, its
// opening sentence, and the date its structured data gives. Ports of series_lede(),
// series_when() and series_start() in scripts/build.py.
import type { Row, Series } from "../data/index.ts";
import { strip } from "../data/errors.ts";
import { KIND_LABEL, totals, townWeights } from "./rows.ts";

const SERIES_WORD: Record<Series["kind"], string> = {
  series: "discourse series",
  camp: "meditation camp talks",
  darshan: "darshan diary",
  interview: "press interviews",
  untitled: "talks",
};

/** A series page's address, relative to the site root. */
export function seriesUrl(x: Series): string {
  return `series/${x.slug}/`;
}

export function seriesTitle(x: Series): string {
  return `${x.name} (${x.span}), Osho ${SERIES_WORD[x.kind]}`;
}

/** A row's dates with its year, as a phrase that follows a comma. */
export function seriesWhen(r: Row): string {
  const year = r.sort.slice(0, 4);
  const dates = strip(r.dates);
  if (dates === year) return `in ${year}`;
  return /\p{Nd}{4}/u.test(dates) ? dates : `${dates} ${year}`;
}

/** The date a sort key really carries: 1966-01-00 is January 1966, 1967-00 is the year 1967. Empty when it is no date. */
export function seriesStart(sort: string): string {
  const parts = /^[0-9]{4}(-[0-9]{2}){0,2}/.exec(sort)![0].split("-");
  while (parts.length > 1 && parts.at(-1) === "00") parts.pop();
  const [year, month, day] = [Number(parts[0]), Number(parts[1] ?? 1), Number(parts[2] ?? 1)];
  // Date.UTC rolls an impossible day over into the next month, so a real date comes back unchanged.
  const date = new Date(Date.UTC(2000, month - 1, day));
  date.setUTCFullYear(year);
  const real = year >= 1 && month >= 1 && month <= 12 && day >= 1
    && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? parts.join("-") : "";
}

/** One or two plain sentences on what the series is, built only from its rows and media.csv. */
export function seriesLede(x: Series): string {
  const rows = x.entries.map((e) => e.row);
  const { known, open } = totals(rows);
  const count = known && !open ? `${known} talk${known === 1 ? "" : "s"}` : known ? `At least ${known} talks` : "Talks";
  const langs = new Set(rows.map((r) => r.lang).filter(Boolean));
  const lang = langs.size === 1 && langs.has("hi") ? " in Hindi" : langs.size === 1 && langs.has("en") ? " in English" : "";
  const label = KIND_LABEL[x.kind];
  const lead = label ? `${label}. ` : "";
  let text: string;
  if (rows.length === 1) {
    text = `${lead}${count}${lang} at ${rows[0]!.place}, ${seriesWhen(rows[0]!)}.`;
  } else {
    const { ranked } = townWeights(rows);
    const towns = ranked.slice(0, 3).join(", ") + (ranked.length > 3 ? " and elsewhere" : "");
    const when = x.span.includes(" to ") ? `from ${x.span}` : `in ${x.span}`;
    text = `${lead}${count}${lang} listed in ${rows.length} entries ${when}, at ${towns}.`;
  }
  const whole = Number(x.media["talks"] || 0);
  if (whole > known && whole > 1) text += ` The wiki lists ${whole} talks in the whole series.`;
  return text;
}
