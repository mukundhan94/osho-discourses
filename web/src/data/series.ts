// The list of series pages. Ports of collect_series() and the reading half of
// load_slugs() in scripts/build.py.
import fs from "node:fs";
import path from "node:path";
import { readTable, records } from "./csv.ts";
import { compare, DataError, repr, strip } from "./errors.ts";
import type { Kind, Media, Row, Year } from "./load.ts";
import { mediaFor, rowIds } from "./match.ts";
import { norm } from "./norm.ts";

export { mediaFor, rowIds } from "./match.ts";

export type Entry = { year: Year; row: Row; rid: string };

export type Series = {
  /** The key in data/media.csv and data/slugs.csv. */
  key: string;
  media: Media;
  /** The rows that belong to the series, oldest first. */
  entries: Entry[];
  name: string;
  kind: Kind;
  /** The years the series has rows in, in page order. */
  years: Year[];
  /** "1974", or "1974 to 1975". */
  span: string;
  /** The address, from data/slugs.csv: the page is at /series/<slug>/. */
  slug: string;
};

/**
 * Every titled series with the rows that belong to it, oldest first.
 * A row belongs to the series media.csv matches it to, the same match the row's links use.
 */
export function collectSeries(years: Year[], rowsByYear: Map<string, Row[]>, media: Map<string, Media>): Omit<Series, "slug">[] {
  const found = new Map<string, { key: string; media: Media; entries: Entry[] }>();
  for (const year of years) {
    const rows = rowsByYear.get(year.id)!;
    const ids = rowIds(rows);
    rows.forEach((row, i) => {
      const m = mediaFor(row.title, media);
      if (!m) return;
      const key = m["key"]!;
      if (!found.has(key)) found.set(key, { key, media: m, entries: [] });
      found.get(key)!.entries.push({ year, row, rid: ids[i]! });
    });
  }
  const out = [...found.values()].sort(
    (a, b) => compare(a.entries[0]!.row.sort, b.entries[0]!.row.sort) || compare(a.key, b.key),
  );
  return out.map((x) => {
    const first = x.entries[0]!.row.title;
    // Prefer the wiki's spelling without its script gloss or part number; fall back to the row's title.
    const wiki = strip(
      x.media["wiki_title"]!.replace(/\s*\([^)]*[^\x00-\x7f][^)]*\)/g, "").replace(/\s*~\s*\p{Nd}+\s*$/u, ""),
    );
    const row = strip(first.replace(/,\s*\p{Nd}[\p{Nd} ,toand]*$/u, ""));
    const name = norm(wiki) === x.key ? wiki : row;
    if (norm(name) !== x.key) {
      throw new DataError(`series ${repr(x.key)}: cannot work out a display name from ${repr(first)}`);
    }
    // The kind most of its rows have; on a tie, the one that sorts last.
    const kinds = x.entries.map((e) => e.row.kind);
    const count = (k: Kind) => kinds.filter((v) => v === k).length;
    const kind = [...new Set(kinds)].reduce((best, k) =>
      count(k) > count(best) || (count(k) === count(best) && k > best) ? k : best,
    );
    const ids = new Set(x.entries.map((e) => e.year.id));
    const a = x.entries[0]!.row.sort.slice(0, 4);
    const b = x.entries.at(-1)!.row.sort.slice(0, 4);
    return { ...x, name, kind, years: years.filter((y) => ids.has(y.id)), span: a === b ? a : `${a} to ${b}` };
  });
}

/**
 * The address of each series page, from data/slugs.csv. A published address never
 * moves, so this only reads: `make slugs` is what adds a row for a new series.
 */
export function loadSlugs(root: string, keys: string[]): Map<string, string> {
  const file = path.join(root, "data", "slugs.csv");
  const table = fs.existsSync(file) ? readTable(file) : { header: ["key", "slug"], rows: [] };
  if (table.header?.length !== 2 || table.header[0] !== "key" || table.header[1] !== "slug") {
    throw new DataError("slugs.csv: header must be key,slug");
  }
  const slugs = new Map<string, string>();
  const used = new Set<string>();
  records(table).forEach((r, i) => {
    const at = `slugs.csv:${i + 2}`;
    const key = r["key"]!;
    const slug = r["slug"]!;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      throw new DataError(`${at}: slug must be lower-case letters and digits joined by hyphens`);
    }
    if (slugs.has(key) || used.has(slug)) throw new DataError(`${at}: key or slug is used more than once`);
    slugs.set(key, slug);
    used.add(slug);
  });
  const wanted = new Set(keys);
  const gone = [...slugs.keys()].filter((k) => !wanted.has(k)).sort(compare);
  if (gone.length) {
    throw new DataError(
      `slugs.csv: ${repr(gone[0]!)} is no longer a series. Its page is public, so add a redirect ` +
        `for /series/${slugs.get(gone[0]!)}/ in vercel.json, then remove its row.`,
    );
  }
  const missing = keys.filter((k) => !slugs.has(k)).sort(compare);
  if (missing.length) {
    throw new DataError(
      `slugs.csv: ${missing.length} series have no address yet, the first is ${repr(missing[0]!)}. Run \`make slugs\`.`,
    );
  }
  return slugs;
}
