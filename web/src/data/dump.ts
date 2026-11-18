// The loaded data as plain JSON, in the shape scripts/data_dump.py writes, so the
// two loaders can be compared value for value.
import type { Site } from "./index.ts";
import { norm } from "./norm.ts";
import { mediaFor, rowIds } from "./series.ts";

export function dump(site: Site): unknown {
  return {
    years: site.years,
    places: Object.fromEntries(site.places),
    media: Object.fromEntries(site.media),
    links: Object.fromEntries(site.links),
    rows: Object.fromEntries(
      [...site.rowsByYear].map(([id, rows]) => {
        const ids = rowIds(rows);
        return [
          id,
          rows.map(({ townList, ...columns }, i) => ({
            ...columns,
            town_list: townList,
            rid: ids[i],
            key: norm(columns.title),
            media_key: mediaFor(columns.title, site.media)?.["key"] ?? null,
          })),
        ];
      }),
    ),
    series: site.series.map((x) => ({
      key: x.key,
      name: x.name,
      kind: x.kind,
      slug: x.slug,
      span: x.span,
      years: x.years.map((y) => y.id),
      entries: x.entries.map((e) => [e.year.id, e.rid]),
    })),
    grand: site.grand,
  };
}
