#!/usr/bin/env python3
"""Print everything scripts/build.py loads from data/, as JSON. Standard library only.

Usage: python3 scripts/data_dump.py [ROOT]
  ROOT  the folder that holds data/ and assets/ (default: the repository)

Used while the build moves from Python to React. The TypeScript loader in
web/src/data/ must load the same values and stop on the same faults, and the
test beside it compares its result with this one. A fault in the data ends
this script with the message build.py would give.

It runs build.py's own loading functions, in the order main() calls them.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402
from wiki_check import norm  # noqa: E402


def load(root):
    build.ROOT, build.DATA = root, root / "data"
    places = build.load_places()
    media = build.load_media()
    links = build.load_links()
    years = json.loads((build.DATA / "years.json").read_text(encoding="utf-8"))
    all_rows, rows_by_year = [], {}
    for y in years:
        y.setdefault("label", y["id"])
        y.setdefault("numeral", y["id"])
        y.setdefault("nav", y["id"][-2:])
        y.setdefault("source", f"{build.WIKI}_{y['id']}")
        build.check_photo(y)
        rows = build.load_rows(y["id"], places)
        if not rows:
            raise SystemExit(f"{y['id']}: no rows")
        all_rows += rows
        rows_by_year[y["id"]] = rows
    ids = [y["id"] for y in years]
    if len(set(ids)) != len(ids):
        raise SystemExit(f"years.json: the id {max(ids, key=ids.count)!r} is used more than once")
    numerals = [y["numeral"] for y in years]
    if numerals != sorted(set(numerals)):
        raise SystemExit("years.json: the years must be in date order, each numeral later than the one before")
    row_keys = [norm(r["title"]) for r in all_rows]
    for key, items in links.items():
        if not any(k == key or k.startswith(key + " ") for k in row_keys):
            raise SystemExit(f"links.csv: no series is titled {items[0]['title']!r}")
    series = build.collect_series(years, rows_by_year, media)
    slugs = build.load_slugs(series)
    return {
        "years": years,
        "places": places,
        "media": media,
        "links": links,
        "rows": {
            yid: [dict(r, rid=rid, key=norm(r["title"]), media_key=(build.media_for(r["title"], media) or {}).get("key"))
                  for r, rid in zip(rows, build.row_ids(rows))]
            for yid, rows in rows_by_year.items()
        },
        "series": [
            {"key": x["key"], "name": x["name"], "kind": x["kind"], "slug": slugs[x["key"]], "span": x["span"],
             "years": [y["id"] for y in x["years"]], "entries": [[y["id"], rid] for y, _, rid in x["entries"]]}
            for x in series
        ],
        "grand": {"rows": len(all_rows), "towns": len({t for r in all_rows for t in r["town_list"]})},
    }


if __name__ == "__main__":
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else build.ROOT
    json.dump(load(root), sys.stdout, ensure_ascii=False)
