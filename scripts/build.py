#!/usr/bin/env python3
"""Build the site into _site/ from data/ and assets/. Standard library only.

Usage: python3 scripts/build.py
"""
import csv
import html
import json
import math
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "_site"

KINDS = {"series", "camp", "untitled"}
COLUMNS = ["sort", "dates", "title", "place", "towns", "talks", "kind", "unsure", "note"]

# Map window in degrees. Every town in data/places.csv must fall inside it.
LON0, LON1, LAT0, LAT1 = 68.0, 90.0, 15.5, 33.0
SCALE = 13.0
KX = math.cos(math.radians(23))

SOURCES = [
    ("Sannyas Wiki, Osho Timeline (index of year pages)", "https://www.sannyas.wiki/index.php?title=Osho_Timeline"),
    ("Sannyas Wiki, Osho Timeline before 1964", "https://www.sannyas.wiki/index.php?title=Osho_Timeline_before_1964"),
    ("Sannyas Wiki, Osho Timeline 1964", "https://www.sannyas.wiki/index.php?title=Osho_Timeline_1964"),
    ("Sannyas Wiki, Osho Timeline 1965", "https://www.sannyas.wiki/index.php?title=Osho_Timeline_1965"),
    ("Sannyas Wiki, Osho Timeline 1966", "https://www.sannyas.wiki/index.php?title=Osho_Timeline_1966"),
    ("Sannyas Wiki, Osho Timeline 1967", "https://www.sannyas.wiki/index.php?title=Osho_Timeline_1967"),
    ("Osho Source Book, Part Two", "https://oshosourcebook.com/part-two/"),
    ("Neeten, Osho's First Book From His First Camp (PDF)", "https://www.pierreevald.dk/wp-content/uploads/RanakpurCamp.pdf"),
]

e = html.escape


def load_places():
    with open(DATA / "places.csv", newline="", encoding="utf-8") as f:
        places = {r["town"]: (float(r["lat"]), float(r["lon"])) for r in csv.DictReader(f)}
    for town, (lat, lon) in places.items():
        if not (LAT0 <= lat <= LAT1 and LON0 <= lon <= LON1):
            raise SystemExit(f"places.csv: {town} lies outside the map window")
    return places


def load_rows(year_id, places):
    path = DATA / "talks" / f"{year_id}.csv"
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != COLUMNS:
            raise SystemExit(f"{path.name}: header must be {','.join(COLUMNS)}")
        rows = list(reader)
    for n, r in enumerate(rows, start=2):
        if r["kind"] not in KINDS:
            raise SystemExit(f"{path.name}:{n}: kind must be one of {sorted(KINDS)}")
        if r["unsure"] not in ("", "y"):
            raise SystemExit(f"{path.name}:{n}: unsure must be empty or y")
        r["town_list"] = [t for t in r["towns"].split(";") if t]
        for t in r["town_list"]:
            if t not in places:
                raise SystemExit(f"{path.name}:{n}: town {t!r} is not in places.csv")
    return sorted(rows, key=lambda r: r["sort"])


def talk_number(text):
    m = re.search(r"\d+", text)
    return int(m.group()) if m else None


def totals(rows):
    counted = [talk_number(r["talks"]) for r in rows]
    known = sum(n for n in counted if n is not None)
    open_rows = sum(1 for r in rows if not r["talks"].strip().isdigit())
    return known, open_rows


def project(lat, lon):
    return (lon - LON0) * KX * SCALE, (LAT1 - lat) * SCALE


def outline_path():
    ring = json.loads((DATA / "india-outline.json").read_text(encoding="utf-8"))["ring"]
    pts = [project(lat, lon) for lon, lat in ring]
    return "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z"


def map_svg(year, rows, places, outline):
    weight, camps = {}, set()
    for r in rows:
        n = talk_number(r["talks"]) or 1
        for t in r["town_list"]:
            weight[t] = weight.get(t, 0) + n / len(r["town_list"])
            if r["kind"] == "camp":
                camps.add(t)
    width = (LON1 - LON0) * KX * SCALE
    height = (LAT1 - LAT0) * SCALE
    marks, labels, taken = [], [], []
    order = sorted(weight, key=lambda t: (t not in camps, -weight[t]))
    for t in sorted(weight, key=lambda t: -weight[t]):
        x, y = project(*places[t])
        if t in camps:
            marks.append(f'<rect class="camp" x="{x-4.5:.1f}" y="{y-4.5:.1f}" width="9" height="9" transform="rotate(45 {x:.1f} {y:.1f})"/>')
        else:
            rad = 2.2 + min(4.5, math.sqrt(weight[t]) * 0.9)
            marks.append(f'<circle class="town" cx="{x:.1f}" cy="{y:.1f}" r="{rad:.1f}"/>')
    for t in order:
        if len(labels) >= 7:
            break
        x, y = project(*places[t])
        if any(abs(y - ty) < 12 and abs(x - tx) < 62 for tx, ty in taken):
            continue
        left = x > width - 70
        lx = x - 8 if left else x + 8
        anchor = "end" if left else "start"
        labels.append(f'<text x="{lx:.1f}" y="{y+4:.1f}" text-anchor="{anchor}">{e(t)}</text>')
        taken.append((x, y))
    label = f"Map of central and northern India marking the {len(weight)} towns with listed talks in {year['nav']}"
    return (
        f'<svg viewBox="0 0 {width:.0f} {height:.0f}" role="img" aria-label="{e(label)}">'
        f'<path class="land" d="{outline}"/>' + "".join(marks) + "".join(labels) + "</svg>"
    )


UNSURE = (
    '<svg class="unsure" viewBox="0 0 16 16" role="img" aria-label="Marked uncertain in the source">'
    '<circle cx="8" cy="8" r="6"/></svg>'
)


def row_html(r):
    note = r["note"].strip()
    if r["kind"] == "camp" and "camp" not in (r["title"] + note).lower():
        note = f"Meditation camp. {note}" if note else "Meditation camp"
    note_html = f'<span class="note">{e(note)}</span>' if note else ""
    mark = UNSURE if r["unsure"] else ""
    unit = "" if r["talks"] == "unknown" else ("talk" if r["talks"] == "1" else "talks")
    return (
        f'<tr class="{r["kind"]}">'
        f'<td class="dates">{e(r["dates"])}{mark}</td>'
        f'<td class="what"><span class="title">{e(r["title"])}</span>{note_html}</td>'
        f'<td class="place">{e(r["place"])}</td>'
        f'<td class="talks" data-unit="{unit}">{e(r["talks"])}</td></tr>'
    )


def year_html(year, rows, places, outline):
    known, open_rows = totals(rows)
    towns = sorted({t for r in rows for t in r["town_list"]})
    camps = sum(1 for r in rows if r["kind"] == "camp")
    summary = f"{len(rows)} entries and {known} counted talks in {len(towns)} towns."
    if camps:
        summary += f" {camps} meditation camp{'s' if camps != 1 else ''}."
    if open_rows:
        summary += f" {open_rows} entries have no firm count."
    p = year["photo"]
    sub = f'<span class="sub">{e(year["numeral_sub"])}</span>' if year.get("numeral_sub") else ""
    return f"""
<section class="year" id="y-{e(year['id'])}" aria-labelledby="h-{e(year['id'])}">
  <div class="rail">
    <span class="stud" aria-hidden="true"></span>
    <div class="rail-in">
    <h2 id="h-{e(year['id'])}"><span class="num">{e(year['numeral'])}</span>{sub}</h2>
    <p class="summary">{e(summary)}</p>
    <figure class="map">{map_svg(year, rows, places, outline)}
      <figcaption>Towns with listed talks. Diamonds are camps.</figcaption></figure>
    </div>
  </div>
  <div class="body">
    <h3>{e(year['heading'])}</h3>
    <p class="lede">{e(year['lede'])}</p>
    <figure class="photo">
      <div class="plate"><img src="assets/img/{e(p['file'])}" alt="{e(p['alt'])}" loading="lazy" width="1400" height="933"></div>
      <figcaption>{e(p['caption'])} <span class="credit">Recent photograph by {e(p['author'])}, <a href="{e(p['licence_url'])}">{e(p['licence'])}</a>, via <a href="{e(p['source_url'])}">Wikimedia Commons</a>.</span></figcaption>
    </figure>
    <table>
      <caption>Talks in {e(year['nav'].lower() if year['nav'].startswith('Before') else year['nav'])}, in date order</caption>
      <thead><tr><th scope="col">Dates</th><th scope="col">Series or talk</th><th scope="col">Place</th><th scope="col">Talks</th></tr></thead>
      <tbody>{''.join(row_html(r) for r in rows)}</tbody>
    </table>
  </div>
</section>"""


def page(years, sections, grand):
    nav = "".join(f'<a href="#y-{e(y["id"])}">{e(y["nav"])}</a>' for y in years)
    sources = "".join(f'<li><a href="{e(u)}">{e(t)}</a></li>' for t, u in SOURCES)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Osho: the talks, 1954 to 1967</title>
<meta name="description" content="A chronology of Osho's talks from 1954 to 1967: series, dates, places and talk counts, compiled from the Sannyas Wiki year timelines.">
<link rel="preload" href="assets/fonts/teko-latin-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css">
</head>
<body>
<a class="skip" href="#main">Skip to the chronology</a>
<header class="mast">
  <h1>Osho: the talks<br>1954 to 1967</h1>
  <p>Every known talk in date order: the series, the place and the number of talks. {grand['rows']} entries across {grand['towns']} towns so far. Later years will follow.</p>
</header>
<nav class="years" aria-label="Years">{nav}<a href="#sources">Sources</a></nav>
<main id="main">
<section class="reading" aria-labelledby="h-reading">
  <h2 id="h-reading">How to read this</h2>
  <div class="cols">
    <ul>
      <li>Counts are rows on the Sannyas Wiki, not verified totals. "At least" and "about" are the source's own words.</li>
      <li>Many titles are later book compilations of talks given in different towns, so one series can span months and cities. A number after a title is the chapter given on that date.</li>
      <li>Whether a tape survives was not checked for any row.</li>
      <li>Every talk in these years was given in Hindi. Titles are romanised as on the wiki.</li>
    </ul>
    <table class="legend">
      <caption>Marks used in the tables</caption>
      <tbody>
        <tr class="series"><td class="what"><span class="title">Path Ki Khoj</span></td><td>A titled series, in heavier type</td></tr>
        <tr class="untitled"><td class="what"><span class="title">Talks in Nandurbar</span></td><td>Untitled talks, named here by town</td></tr>
        <tr class="camp"><td class="what"><span class="title">Sadhana Path</span></td><td>An inked row is a meditation camp</td></tr>
        <tr class="untitled"><td class="what">Aug{UNSURE}</td><td>A broken ring: date, place or count is marked uncertain in the source</td></tr>
      </tbody>
    </table>
  </div>
</section>
{''.join(sections)}
</main>
<footer id="sources">
  <h2>Sources</h2>
  <div class="cols">
    <div>
      <ul class="links">{sources}</ul>
    </div>
    <div>
      <p>Compiled in November 2026 from the pages listed here. The wiki is the authority for every row. Where this page and the wiki differ, the wiki is right and this page needs correcting.</p>
      <p>The map outline is from Natural Earth (public domain). Town positions are approximate. Photographs are recent, credited beside each one, and reused under their Creative Commons licences. Type is Teko and Mukta, both under the SIL Open Font License.</p>
    </div>
  </div>
</footer>
<script src="assets/site.js" defer></script>
</body>
</html>
"""


def main():
    places = load_places()
    years = json.loads((DATA / "years.json").read_text(encoding="utf-8"))
    outline = outline_path()
    sections, all_rows = [], []
    for y in years:
        rows = load_rows(y["id"], places)
        all_rows += rows
        sections.append(year_html(y, rows, places, outline))
    grand = {"rows": len(all_rows), "towns": len({t for r in all_rows for t in r["town_list"]})}
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    shutil.copytree(ROOT / "assets", OUT / "assets")
    (OUT / ".nojekyll").write_text("")
    (OUT / "index.html").write_text(page(years, sections, grand), encoding="utf-8")
    print(f"built _site/index.html: {grand['rows']} entries, {grand['towns']} towns, {len(years)} sections")


if __name__ == "__main__":
    main()
