// Which series a row belongs to, and the id a row carries on the page. Ports of
// media_for() and row_ids() in scripts/build.py. Nothing here reads a file, so the
// parts of the site that run in the browser can use it.
import type { Media, Row } from "./load.ts";
import { norm } from "./norm.ts";

/** The media.csv line a title matches: the longest key the title equals or starts with, word for word. */
export function mediaFor(title: string, media: Map<string, Media>): Media | undefined {
  const key = norm(title);
  let hit: string | undefined;
  for (const k of media.keys()) {
    if ((key === k || key.startsWith(k + " ")) && (hit === undefined || k.length > hit.length)) hit = k;
  }
  return hit === undefined ? undefined : media.get(hit);
}

/** The id each row carries on the page, in row order. Rows that share a sort key get an x added. */
export function rowIds(rows: Row[]): string[] {
  const seen = new Set<string>();
  return rows.map((r) => {
    let rid = "r-" + r.sort.toLowerCase().replace(/[^0-9a-z]+/g, "-");
    while (seen.has(rid)) rid += "x";
    seen.add(rid);
    return rid;
  });
}
