#!/usr/bin/env python3
"""Build data/media.csv: for each titled series, where to read about, hear and watch it.

For every series title on the wiki year pages that a data row uses, this finds
the wiki's series page, reads its table of contents (talks, lengths, whether
video or audio exists) and looks for a matching OshoWorld audio page in that
site's public sitemap. Nothing is hosted here: the output is links and counts.

Usage: python3 scripts/media_links.py [--cache DIR]
"""
import argparse
import csv
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wiki_check import ROOT, fetch, norm, wiki_groups  # noqa: E402

WIKI = "https://www.sannyas.wiki/index.php?title="
OSHOWORLD = "https://oshoworld.com/"
UA = {"User-Agent": "osho-discourses-check/0.1"}
COLUMNS = ["key", "wiki_title", "wiki_url", "talks", "video", "audio", "minutes", "listen_url"]


def get(url, cache, name):
    """Fetch a URL once, keeping the body in the cache directory. Missing pages cache as empty."""
    path = cache / name
    if not path.exists():
        try:
            body = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except urllib.error.HTTPError:
            body = b""
        path.write_bytes(body)
        time.sleep(1.2)
    return path.read_text(encoding="utf-8", errors="replace")


def wiki_raw(title, cache):
    safe = re.sub(r"[^A-Za-z0-9]+", "_", title)[:80] + "_" + str(abs(hash(title)) % 10**6)
    url = WIKI + urllib.parse.quote(title.replace(" ", "_")) + "&action=raw"
    text = get(url, cache, f"page_{safe}.wiki")
    m = re.match(r"#REDIRECT\s*\[\[([^\]]+)\]\]", text.strip(), flags=re.I)
    if m:
        return wiki_raw(m.group(1).strip(), cache)
    return title, text


def series_page(title, first_link, cache):
    """Return (page title, text) of the wiki page holding the series' table of contents."""
    name, text = wiki_raw(title, cache)
    if "TOCLine" in text:
        return name, text
    _, talk = wiki_raw(first_link, cache)
    for field in ("firsted", "firsted2"):
        m = re.search(rf"^\s*{field}\s*=\s*(.+?)\s*\|?\s*$", talk, flags=re.M)
        if m and m.group(1).strip():
            cand = re.sub(r"\[\[|\]\]|''", "", m.group(1)).split("|")[0].strip()
            name2, text2 = wiki_raw(cand, cache)
            if "TOCLine" in text2:
                return name2, text2
    if text.strip():
        return name, text
    return (first_link, talk) if talk.strip() else (None, "")


def toc_stats(text):
    talks = video = audio = minutes = 0
    # A page can carry one table of contents per edition; the first is enough.
    first = re.split(r"\{\{TOCTable", text)
    text = first[1] if len(first) > 1 else text
    for line in re.findall(r"\{\{TOCLine\s*\|(.*?)\}\}", text, flags=re.S):
        cells = [c.strip() for c in line.split("|")]
        if len(cells) < 4:
            continue
        talks += 1
        medium = cells[-1].lower()
        video += "video" in medium
        audio += "audio" in medium and "video" not in medium
        m = re.search(r"(?:(\d+)\s*h)?\s*(?:(\d+)\s*min)?", cells[-2])
        if m:
            minutes += int(m.group(1) or 0) * 60 + int(m.group(2) or 0)
    return talks, video, audio, minutes


def oshoworld_index(cache):
    """Map a normalised series name to its OshoWorld page, from the public sitemap."""
    xml = get(OSHOWORLD + "sitemap.xml", cache, "oshoworld_sitemap.xml")
    index = {}
    for slug in re.findall(r"<loc>https://oshoworld\.com/([^<]+)</loc>", xml):
        m = (re.fullmatch(r"(?:\d+-)?(.+?)(?:-by-osho)?-0*1-(\d+)", slug)
             or re.fullmatch(r"(.+?)-series", slug)
             or re.fullmatch(r"(.+-vol-\d+)", slug))
        if m and not slug.startswith(("audio-detail", "book-", "store_", "poona-", "blog")):
            index.setdefault(norm(m.group(1).replace("-", " ")), slug)
    return index


def listen_url(titles, index, cache):
    keys = []
    for title in titles:
        if title:
            keys += [norm(title), norm(re.sub(r"^The\s+", "", title))]
    for key in keys:
        slug = index.get(key)
        if slug and get(OSHOWORLD + slug, cache, f"ow_{slug}.html").strip():
            return OSHOWORLD + slug
    return ""


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--cache", default="/tmp/osho-wiki", help="directory for downloaded pages")
    args = ap.parse_args()
    cache = Path(args.cache)
    cache.mkdir(parents=True, exist_ok=True)
    index = oshoworld_index(cache)
    wanted = {}
    for path in sorted((ROOT / "data" / "talks").glob("*.csv")):
        text = fetch(path.stem, cache)
        groups = wiki_groups(text)
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                key = norm(row["title"])
                hit = max((k for k in groups if key == k or key.startswith(k + " ")), key=len, default=None)
                if hit and hit not in wanted:
                    title = groups[hit]["title"]
                    m = re.search(r"\[\[(" + re.escape(title) + r"\s*~\s*\d+)", text)
                    wanted[hit] = (title, m.group(1) if m else title)
    rows = []
    for n, (key, (title, first_link)) in enumerate(sorted(wanted.items()), 1):
        page, text = series_page(title, first_link, cache)
        talks, video, audio, minutes = toc_stats(text)
        rows.append({
            "key": key, "wiki_title": page or "",
            "wiki_url": WIKI + urllib.parse.quote(page.replace(" ", "_"), safe="_~()',:!") if page else "",
            "talks": talks or "", "video": video if talks else "", "audio": audio if talks else "",
            "minutes": minutes or "", "listen_url": listen_url((title, page), index, cache),
        })
        if n % 25 == 0:
            print(f"{n}/{len(wanted)}", flush=True)
    with open(ROOT / "data" / "media.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
    have = lambda col: sum(1 for r in rows if r[col])  # noqa: E731
    print(f"{len(rows)} series: {have('wiki_url')} wiki pages, {have('talks')} with a talk list, "
          f"{have('listen_url')} OshoWorld pages")


if __name__ == "__main__":
    main()
