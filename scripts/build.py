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

KINDS = {"series", "camp", "untitled", "darshan", "interview"}
KIND_LABEL = {"camp": "Meditation camp", "darshan": "Darshan diary", "interview": "Press interviews"}
LANGS = {"": "", "hi": "Hindi", "en": "English"}
COLUMNS = ["sort", "dates", "title", "place", "towns", "talks", "kind", "unsure", "note", "lang"]

# Map canvas in SVG units, and the window used when every town of a year is in India.
MAP_W, MAP_H = 265.0, 234.0
INDIA = (68.0, 90.0, 15.5, 33.0)  # lon0, lon1, lat0, lat1

WIKI = "https://www.sannyas.wiki/index.php?title=Osho_Timeline"
SOURCES = [
    ("Sannyas Wiki, Osho Timeline (index of year pages)", WIKI),
    ("Osho Source Book, Part Two", "https://oshosourcebook.com/part-two/"),
    ("Neeten, Osho's First Book From His First Camp (PDF)", "https://www.pierreevald.dk/wp-content/uploads/RanakpurCamp.pdf"),
]

e = html.escape


def load_places():
    with open(DATA / "places.csv", newline="", encoding="utf-8") as f:
        return {r["town"]: (float(r["lat"]), float(r["lon"])) for r in csv.DictReader(f)}


def load_rows(year_id, places):
    path = DATA / "talks" / f"{year_id}.csv"
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != COLUMNS:
            raise SystemExit(f"{path.name}: header must be {','.join(COLUMNS)}")
        rows = list(reader)
    for n, r in enumerate(rows, start=2):
        if None in r or any(v is None for v in r.values()):
            raise SystemExit(f"{path.name}:{n}: wrong number of fields")
        if r["kind"] not in KINDS:
            raise SystemExit(f"{path.name}:{n}: kind must be one of {sorted(KINDS)}")
        if r["unsure"] not in ("", "y"):
            raise SystemExit(f"{path.name}:{n}: unsure must be empty or y")
        if r["lang"] not in LANGS:
            raise SystemExit(f"{path.name}:{n}: lang must be hi, en or empty")
        if "—" in "".join(r.values()):
            raise SystemExit(f"{path.name}:{n}: em-dash found")
        r["town_list"] = [t.strip() for t in r["towns"].split(";") if t.strip()]
        for t in r["town_list"]:
            if t not in places:
                raise SystemExit(f"{path.name}:{n}: town {t!r} is not in places.csv")
    return sorted(rows, key=lambda r: r["sort"])


def check_photo(year):
    photo = year.get("photo")
    if not photo:
        return
    if not (ROOT / "assets" / "img" / photo["file"]).exists():
        raise SystemExit(f"{year['id']}: photo {photo['file']} is not in assets/img/")
    if f"`{photo['file']}`" not in (ROOT / "assets" / "img" / "CREDITS.md").read_text(encoding="utf-8"):
        raise SystemExit(f"{year['id']}: photo {photo['file']} is not listed in assets/img/CREDITS.md")


def talk_number(text):
    m = re.search(r"\d+", text)
    return int(m.group()) if m else None


def totals(rows):
    known = sum(n for n in (talk_number(r["talks"]) for r in rows) if n is not None)
    open_rows = sum(1 for r in rows if not r["talks"].strip().isdigit())
    return known, open_rows


def town_weights(rows):
    weight, camps = {}, set()
    for r in rows:
        n = talk_number(r["talks"]) or 1
        for t in r["town_list"]:
            weight[t] = weight.get(t, 0) + n / len(r["town_list"])
            if r["kind"] == "camp":
                camps.add(t)
    ranked = sorted(weight, key=lambda t: (-weight[t], t not in camps, t))
    return weight, camps, ranked


# ---- maps -----------------------------------------------------------------

def window_for(coords):
    """Return (lon0, lon1, lat0, lat1, is_india) fitted to the canvas aspect."""
    lo0, lo1, la0, la1 = INDIA
    if all(la0 <= lat <= la1 and lo0 <= lon <= lo1 for lat, lon in coords):
        return lo0, lo1, la0, la1, True
    lats = [c[0] for c in coords]
    lons = [c[1] for c in coords]
    lo0, lo1 = min(lons) - 14, max(lons) + 14
    la0, la1 = min(lats) - 12, max(lats) + 12
    aspect = MAP_W / MAP_H
    if (lo1 - lo0) / (la1 - la0) < aspect:
        grow = (la1 - la0) * aspect - (lo1 - lo0)
        lo0, lo1 = lo0 - grow / 2, lo1 + grow / 2
    else:
        grow = (lo1 - lo0) / aspect - (la1 - la0)
        la0, la1 = la0 - grow / 2, la1 + grow / 2
    return lo0, lo1, la0, la1, False


def projector(win):
    lo0, lo1, la0, la1, india = win
    if india:
        kx = math.cos(math.radians(23))
        scale = MAP_H / (la1 - la0)
        return lambda lat, lon: ((lon - lo0) * kx * scale, (la1 - lat) * scale)
    scale = MAP_W / (lo1 - lo0)
    return lambda lat, lon: ((lon - lo0) * scale, (la1 - lat) * scale)


def ring_path(ring, proj):
    return "M" + "L".join("{:.1f},{:.1f}".format(*proj(lat, lon)) for lon, lat in ring) + "Z"


def place_labels(ranked, points, limit=7):
    """Greedy label placement: try right, left, below, above; skip on collision."""
    boxes, out = [], []

    def clash(box, own):
        x0, y0, x1, y1 = box
        if x0 < 2 or y0 < 2 or x1 > MAP_W - 2 or y1 > MAP_H - 2:
            return True
        if any(x0 < bx1 and bx0 < x1 and y0 < by1 and by0 < y1 for bx0, by0, bx1, by1 in boxes):
            return True
        # Avoid dots of towns ranked at or above this one; lower-ranked dots may sit under a label.
        rank = ranked.index(own)
        return any(
            x0 - 3 < points[t][0] < x1 + 3 and y0 - 3 < points[t][1] < y1 + 3
            for t in ranked[:rank]
        )

    placed = []
    for town in ranked:
        if len(out) >= limit:
            break
        x, y = points[town]
        # A town whose dot sits on a higher-ranked labelled dot stays unlabelled.
        if any(abs(x - px) < 10 and abs(y - py) < 10 for px, py in placed):
            continue
        w = len(town) * 6.3 + 2
        options = [
            (x + 8, y + 4, "start", (x + 7, y - 7, x + 8 + w, y + 7)),
            (x - 8, y + 4, "end", (x - 8 - w, y - 7, x - 7, y + 7)),
            (x, y + 18, "middle", (x - w / 2, y + 8, x + w / 2, y + 21)),
            (x, y - 9, "middle", (x - w / 2, y - 21, x + w / 2, y - 8)),
            (x + 7, y - 6, "start", (x + 6, y - 17, x + 7 + w, y - 3)),
            (x + 7, y + 14, "start", (x + 6, y + 3, x + 7 + w, y + 17)),
            (x - 7, y - 6, "end", (x - 7 - w, y - 17, x - 6, y - 3)),
            (x - 7, y + 14, "end", (x - 7 - w, y + 3, x - 6, y + 17)),
        ]
        for lx, ly, anchor, box in options:
            if not clash(box, town):
                placed.append((x, y))
                boxes.append(box)
                out.append(f'<text x="{lx:.1f}" y="{ly:.1f}" text-anchor="{anchor}">{e(town)}</text>')
                break
    return out


def map_svg(year, rows, places, outlines):
    weight, camps, ranked = town_weights(rows)
    if not weight:
        return ""
    win = window_for([places[t] for t in weight])
    proj = projector(win)
    if win[4]:
        land = ring_path(outlines["india"], proj)
        where = "central and northern India"
    else:
        land = "".join(ring_path(r, proj) for r in outlines["world"])
        where = "the world"
    points = {t: proj(*places[t]) for t in weight}
    marks = []
    for t in sorted((t for t in weight if t not in camps), key=lambda t: -weight[t]):
        x, y = points[t]
        rad = 2.2 + min(4.5, math.sqrt(weight[t]) * 0.9)
        marks.append(f'<circle class="town" cx="{x:.1f}" cy="{y:.1f}" r="{rad:.1f}"/>')
    for t in sorted(camps):
        x, y = points[t]
        marks.append(f'<rect class="camp" x="{x-4.5:.1f}" y="{y-4.5:.1f}" width="9" height="9" transform="rotate(45 {x:.1f} {y:.1f})"/>')
    labels = place_labels(ranked, points)
    n = len(weight)
    label = f"Map of {where} marking the {n} place{'s' if n != 1 else ''} with listed talks in {year['label']}"
    caption = "Places with listed talks." + (" Diamonds are camps." if camps else "")
    return (
        f'<figure class="map"><svg viewBox="0 0 {MAP_W:.0f} {MAP_H:.0f}" role="img" aria-label="{e(label)}">'
        f'<path class="land" d="{land}"/>' + "".join(marks) + "".join(labels) + "</svg>"
        f"<figcaption>{caption}</figcaption></figure>"
    )


# ---- page -----------------------------------------------------------------

UNSURE = (
    '<svg class="unsure" viewBox="0 0 16 16" role="img" aria-label="Marked uncertain in the source">'
    '<circle cx="8" cy="8" r="6"/></svg>'
)

def unit_for(talks):
    n = talk_number(talks)
    if n is None:
        return ""
    return "talk" if n == 1 else "talks"


def row_html(r, show_lang):
    note = r["note"].strip()
    label = KIND_LABEL.get(r["kind"])
    if label and label.split()[-1].lower().rstrip("s") not in (r["title"] + " " + note).lower():
        note = f"{label}. {note}" if note else label
    note_html = f'<span class="note">{e(note)}</span>' if note else ""
    lang = f' <span class="lang" data-l="{r["lang"]}">{LANGS[r["lang"]]}</span>' if show_lang and r["lang"] else ""
    mark = UNSURE if r["unsure"] else ""
    head, _, last = r["title"].rpartition(" ")
    title_html = (e(head + " ") if head else "") + f'<span class="keep">{e(last)}{lang}</span>' if lang else e(r["title"])
    return (
        f'<tr class="{r["kind"]}">'
        f'<td class="dates">{e(r["dates"])}{mark}</td>'
        f'<td class="what"><span class="title">{title_html}</span>{note_html}</td>'
        f'<td class="place">{e(r["place"])}</td>'
        f'<td class="talks" data-unit="{unit_for(r["talks"])}">{e(r["talks"])}</td></tr>'
    )


def summary_for(rows):
    known, open_rows = totals(rows)
    towns = {t for r in rows for t in r["town_list"]}
    camps = sum(1 for r in rows if r["kind"] == "camp")
    n = len(rows)
    text = f"{n} entr{'y' if n == 1 else 'ies'} and {known} counted talk{'' if known == 1 else 's'} in {len(towns)} place{'' if len(towns) == 1 else 's'}."
    if camps:
        text += f" {camps} meditation camp{'s' if camps != 1 else ''}."
    if open_rows:
        text += f" {open_rows} entr{'y has' if open_rows == 1 else 'ies have'} no firm count."
    langs = {r["lang"] for r in rows if r["lang"]}
    if langs == {"hi"}:
        text += " All in Hindi."
    elif langs == {"en"}:
        text += " All in English."
    return text, len(langs) > 1


def photo_html(p):
    if not p:
        return ""
    return (
        '<figure class="photo">'
        f'<div class="plate"><img src="assets/img/{e(p["file"])}" alt="{e(p["alt"])}" loading="lazy" width="1400" height="933"></div>'
        f'<figcaption>{e(p["caption"])} <span class="credit">{e(p.get("credit", "Recent photograph by"))} {e(p["author"])}, '
        f'<a href="{e(p["licence_url"])}">{e(p["licence"])}</a>, via <a href="{e(p["source_url"])}">Wikimedia Commons</a>.</span></figcaption>'
        "</figure>"
    )


def year_html(year, rows, places, outlines):
    summary, show_lang = summary_for(rows)
    _, _, ranked = town_weights(rows)
    towns_line = " · ".join(ranked[:4])
    sub = f'<span class="sub">{e(year["numeral_sub"])}</span>' if year.get("numeral_sub") else ""
    photo = photo_html(year.get("photo"))
    yid = e(year["id"])
    return f"""
<section class="year" id="y-{yid}" aria-labelledby="h-{yid}">
  <div class="rail">
    <span class="stud" aria-hidden="true"></span>
    <div class="rail-in">
    <h2 id="h-{yid}"><span class="num">{e(year['numeral'])}</span>{sub}</h2>
    <p class="towns">{e(towns_line)}</p>
    <p class="summary">{e(summary)}</p>
    {map_svg(year, rows, places, outlines)}
    </div>
  </div>
  <div class="body">
    <div class="opener{' has-photo' if photo else ''}">
      <div class="intro">
        <h3>{e(year['heading'])}</h3>
        <p class="lede">{e(year['lede'])}</p>
      </div>
      {photo}
    </div>
    <table>
      <caption>Talks, {e(year['label'])}, in date order</caption>
      <thead><tr><th scope="col" class="dates">Dates</th><th scope="col">Series or talk</th><th scope="col" class="place">Place</th><th scope="col" class="talks">Talks</th></tr></thead>
      <tbody>{''.join(row_html(r, show_lang) for r in rows)}</tbody>
    </table>
    <p class="source">Source: <a href="{e(year['source'])}">Sannyas Wiki, Osho Timeline, {e(year['label'])}</a></p>
  </div>
</section>"""


def page(years, sections, grand):
    span = f"{years[0]['numeral']} to {years[-1]['numeral']}"
    nav = "".join(
        f'<a href="#y-{e(y["id"])}" aria-label="{e(y["label"])}">{e(y["nav"])}</a>' for y in years
    )
    sources = "".join(f'<li><a href="{e(u)}">{e(t)}</a></li>' for t, u in SOURCES)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Osho: the talks, {span}</title>
<meta name="description" content="A chronology of Osho's talks from {span}: series, dates, places and talk counts, compiled from the Sannyas Wiki year timelines.">
<meta property="og:title" content="Osho: the talks, {span}">
<meta property="og:description" content="Every known talk in date order: the series, the place and the number of talks.">
<meta property="og:type" content="website">
<meta name="theme-color" content="#1F3A6B">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231F3A6B'/%3E%3Ccircle cx='16' cy='16' r='10' fill='%23E9A21A'/%3E%3Ccircle cx='16' cy='16' r='5' fill='%23C2281D'/%3E%3C/svg%3E">
<link rel="preload" href="assets/fonts/yatra-one-latin-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css">
</head>
<body>
<a class="skip" href="#main">Skip to the chronology</a>
<header class="mast">
  <h1>Osho: the talks<br><span>{span}</span></h1>
  <p>Every known talk in date order: the series, the place and the number of talks. {grand['rows']} entries across {grand['towns']} places.</p>
</header>
<nav class="years" aria-label="Years">{nav}<a href="#sources">Sources</a></nav>
<main id="main">
<section class="reading" aria-labelledby="h-reading">
  <h2 id="h-reading">How to read this</h2>
  <ul class="caveats">
    <li>Counts are rows on the Sannyas Wiki, not verified totals. "At least" and "about" are the source's own words.</li>
    <li>Many early titles are later book compilations of talks given in different towns, so one series can span months and cities.</li>
    <li>Whether a tape survives was not checked for any row.</li>
    <li>Titles are romanised as on the wiki. Where a year mixes Hindi and English, each row says which.</li>
  </ul>
  <ul class="legend" aria-label="Marks used in the tables">
    <li><b>Heavier type</b> is a titled series</li>
    <li><span class="swatch">Green row</span> is a meditation camp</li>
    <li>{UNSURE} date, place or count marked uncertain in the source</li>
  </ul>
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
      <p>Compiled in November 2026. Each year links to its wiki page under its table. The wiki is the authority for every row. Where this page and the wiki differ, the wiki is right and this page needs correcting.</p>
      <p>Map outlines are from Natural Earth (public domain). Positions are approximate. Photographs are credited beside each one. All are recent and reused under Creative Commons licences, except the 1983 photograph of Rajneeshpuram, which its photographer releases for any use with attribution. Type is Yatra One and Hind, both under the SIL Open Font License.</p>
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
    outlines = {
        "india": json.loads((DATA / "india-outline.json").read_text(encoding="utf-8"))["ring"],
        "world": json.loads((DATA / "world-outline.json").read_text(encoding="utf-8"))["rings"],
    }
    sections, all_rows = [], []
    for y in years:
        y.setdefault("label", y["id"])
        y.setdefault("numeral", y["id"])
        y.setdefault("nav", y["id"][-2:])
        y.setdefault("source", f"{WIKI}_{y['id']}")
        check_photo(y)
        rows = load_rows(y["id"], places)
        if not rows:
            raise SystemExit(f"{y['id']}: no rows")
        all_rows += rows
        sections.append(year_html(y, rows, places, outlines))
    grand = {"rows": len(all_rows), "towns": len({t for r in all_rows for t in r["town_list"]})}
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    shutil.copytree(ROOT / "assets", OUT / "assets")
    (OUT / ".nojekyll").write_text("")
    (OUT / "index.html").write_text(page(years, sections, grand), encoding="utf-8")
    print(f"built _site/index.html: {grand['rows']} entries, {grand['towns']} places, {len(years)} sections")


if __name__ == "__main__":
    main()
