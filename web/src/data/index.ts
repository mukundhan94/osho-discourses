// Everything the pages are built from, loaded and checked in the order
// scripts/build.py's main() does it, so a broken file stops both builds on the same fault.
import path from "node:path";
import { DataError, repr } from "./errors.ts";
import { checkPhoto, loadLinks, loadMedia, loadPlaces, loadRows, loadYears } from "./load.ts";
import type { Link, Media, Places, Row, Year } from "./load.ts";
import { norm } from "./norm.ts";
import { collectSeries, loadSlugs } from "./series.ts";
import type { Series } from "./series.ts";

export { DataError } from "./errors.ts";
export type { Kind, Lang, Link, Media, Photo, Places, Row, Year } from "./load.ts";
export { norm } from "./norm.ts";
export { mediaFor, rowIds } from "./series.ts";
export type { Entry, Series } from "./series.ts";

export type Site = {
  years: Year[];
  places: Places;
  media: Map<string, Media>;
  links: Map<string, Link[]>;
  /** Each year's rows in page order, keyed by the year's id. */
  rowsByYear: Map<string, Row[]>;
  series: Series[];
  /** Totals for the home page: every row, and every distinct town. */
  grand: { rows: number; towns: number };
};

/** The repository root: the folder that holds data/ and assets/. npm runs every script from web/. */
export const REPO_ROOT = path.resolve(process.cwd(), "..");

export function loadSite(root: string = REPO_ROOT): Site {
  const places = loadPlaces(root);
  const media = loadMedia(root);
  const links = loadLinks(root);
  const years = loadYears(root);
  const rowsByYear = new Map<string, Row[]>();
  const allRows: Row[] = [];
  for (const y of years) {
    checkPhoto(root, y);
    const rows = loadRows(root, y.id, places);
    if (!rows.length) throw new DataError(`${y.id}: no rows`);
    allRows.push(...rows);
    rowsByYear.set(y.id, rows);
  }
  // Year pages take their address from the id and their neighbours from the order here.
  const ids = years.map((y) => y.id);
  const times = (id: string) => ids.filter((v) => v === id).length;
  if (new Set(ids).size !== ids.length) {
    const most = ids.reduce((best, id) => (times(id) > times(best) ? id : best));
    throw new DataError(`years.json: the id ${repr(most)} is used more than once`);
  }
  const numerals = years.map((y) => y.numeral);
  const ordered = [...new Set(numerals)].sort();
  if (numerals.length !== ordered.length || numerals.some((n, i) => n !== ordered[i])) {
    throw new DataError("years.json: the years must be in date order, each numeral later than the one before");
  }
  const rowKeys = allRows.map((r) => norm(r.title));
  for (const [key, items] of links) {
    if (!rowKeys.some((k) => k === key || k.startsWith(key + " "))) {
      throw new DataError(`links.csv: no series is titled ${repr(items[0]!.title)}`);
    }
  }
  const found = collectSeries(years, rowsByYear, media);
  const slugs = loadSlugs(root, found.map((x) => x.key));
  const series = found.map((x) => ({ ...x, slug: slugs.get(x.key)! }));
  return {
    years,
    places,
    media,
    links,
    rowsByYear,
    series,
    grand: { rows: allRows.length, towns: new Set(allRows.flatMap((r) => r.townList)).size },
  };
}
