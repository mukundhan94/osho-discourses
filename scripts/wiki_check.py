#!/usr/bin/env python3
"""Compare data/talks/<year>.csv against the raw Sannyas Wiki timeline pages.

Downloads each year's page as raw wikitext into a cache directory (not
committed), counts the table rows per series title, and reports where a CSV
row's talk count differs, and which wiki series have no CSV row.

Usage: python3 scripts/wiki_check.py [--cache DIR] [--digest] [YEAR ...]
"""
import argparse
import collections
import csv
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = "https://www.sannyas.wiki/index.php?title=Osho_Timeline_{}&action=raw"
SKIP_TYPES = {"letter", "writings", "note"}


def page_name(year_id):
    return year_id.replace("-", "_")


def fetch(year_id, cache):
    path = cache / f"{page_name(year_id)}.wiki"
    if not path.exists() or path.stat().st_size == 0:
        req = urllib.request.Request(URL.format(page_name(year_id)), headers={"User-Agent": "osho-discourses-check/0.1"})
        path.write_bytes(urllib.request.urlopen(req, timeout=60).read())
        time.sleep(1.5)
    return path.read_text(encoding="utf-8")


def norm(title):
    t = title.lower()
    t = re.sub(r"\((vol\.? *\d+)\)", r" \1 ", t)  # keep "(Vol 2)", drop other glosses
    t = re.sub(r"\([^)]*\)", " ", t)
    t = re.sub(r"\b0+(\d)", r"\1", t)
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return " ".join(t.split())


def wiki_groups(text):
    """Return {normalised title: dict(title, n, first, last, types, langs)} for talk rows."""
    groups = collections.OrderedDict()
    for line in text.split("\n"):
        if not line.startswith("| ") or "||" not in line:
            continue
        cells = [c.strip() for c in line[1:].split("||")]
        if len(cells) < 5:
            continue
        date, _loc, typ, lang, event = cells[0], cells[1], cells[2].lower(), cells[3], "||".join(cells[4:])
        if typ in SKIP_TYPES:
            continue
        m = re.search(r"\[\[([^\]|~]+?)\s*~\s*(\d+)", event)
        if not m:
            continue
        key = norm(m.group(1))
        g = groups.setdefault(key, {"title": m.group(1).strip(), "n": 0, "first": date, "last": date,
                                    "types": collections.Counter(), "langs": collections.Counter()})
        g["n"] += 1
        g["last"] = date
        g["types"][typ] += 1
        g["langs"][lang] += 1
    return groups


def csv_rows(year_id):
    path = ROOT / "data" / "talks" / f"{year_id}.csv"
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def number(text):
    m = re.search(r"\d+", text)
    return int(m.group()) if m else None


def neighbour(year_id, step):
    """Year id next to this one, if it has a data file (series can run across New Year)."""
    if not year_id.isdigit():
        return None
    other = str(int(year_id) + step)
    return other if (ROOT / "data" / "talks" / f"{other}.csv").exists() else None


def claimed_titles(year_id, groups):
    out = collections.Counter()
    for r in csv_rows(year_id):
        key = norm(r["title"])
        hit = max((k for k in groups if key == k or key.startswith(k + " ")), key=len, default=None)
        if hit:
            out[hit] += number(r["talks"]) or 0
    return out


def check(year_id, cache, digest):
    groups = wiki_groups(fetch(year_id, cache))
    rows = csv_rows(year_id)
    prev_id, next_id = neighbour(year_id, -1), neighbour(year_id, 1)
    next_groups = wiki_groups(fetch(next_id, cache)) if next_id else {}
    prev_claims = claimed_titles(prev_id, groups) if prev_id else {}
    if digest:
        for g in groups.values():
            print(f"  {g['title']} | {dict(g['types'])} | n={g['n']} | {g['first']} -> {g['last']} | {dict(g['langs'])}")
        return 0
    claimed = collections.Counter()
    matched_rows = 0
    for r in rows:
        key = norm(r["title"])
        hit = max((k for k in groups if key == k or key.startswith(k + " ")), key=len, default=None)
        if hit:
            matched_rows += 1
            claimed[hit] += number(r["talks"]) or 0
    problems = 0
    for key, total in claimed.items():
        g = groups[key]
        spill = next_groups.get(key, {}).get("n", 0)
        if total != g["n"] and total != g["n"] + spill:
            problems += 1
            print(f"  COUNT  {g['title']}: csv {total}, wiki rows {g['n']} ({g['first']} -> {g['last']})")
    for key, g in groups.items():
        if key not in claimed and key not in prev_claims and g["n"] >= 2:
            problems += 1
            print(f"  ABSENT {g['title']}: wiki rows {g['n']} ({g['first']} -> {g['last']}) {dict(g['types'])}")
    print(f"{year_id}: {len(rows)} csv rows, {matched_rows} matched to a wiki title, "
          f"{len(groups)} wiki titles, {problems} to review")
    return problems


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--cache", default="/tmp/osho-wiki", help="directory for downloaded wiki text")
    ap.add_argument("--digest", action="store_true", help="print the wiki's series for each year and compare nothing")
    ap.add_argument("years", nargs="*", help="year ids such as 1975 or before-1964 (default: every CSV)")
    args = ap.parse_args()
    cache = Path(args.cache)
    cache.mkdir(parents=True, exist_ok=True)
    years = args.years or sorted(p.stem for p in (ROOT / "data" / "talks").glob("*.csv"))
    total = sum(check(y, cache, args.digest) for y in years)
    sys.exit(1 if total and not args.digest else 0)


if __name__ == "__main__":
    main()
