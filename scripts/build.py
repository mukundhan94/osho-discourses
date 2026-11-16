#!/usr/bin/env python3
"""Build the site into _site/ from data/ and assets/. Standard library only.

Usage: python3 scripts/build.py
"""
import csv
import hashlib
import html
import json
import math
import re
import shutil
import sys
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wiki_check import norm  # noqa: E402

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

SITE = "https://oshodiscourses.com/"
REPO = "https://github.com/mukundhan94/osho-discourses"
NOTICE = ("This is a non-commercial reference library: it collects what was spoken, when and where, "
          "and links to recordings hosted by others. Nothing here is for sale, and the site carries no advertising.")
LINK_KINDS = {"listen": "listen", "watch": "watch", "read": "list"}
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


def load_media():
    """Links and counts per series from data/media.csv, keyed by normalised wiki title."""
    path = DATA / "media.csv"
    if not path.exists():
        return {}
    with open(path, newline="", encoding="utf-8") as f:
        return {r["key"]: r for r in csv.DictReader(f)}


def load_links():
    """Hand-added links from data/links.csv, grouped by normalised series title."""
    path = DATA / "links.csv"
    out = {}
    if not path.exists():
        return out
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != ["title", "kind", "label", "url"]:
            raise SystemExit("links.csv: header must be title,kind,label,url")
        for n, r in enumerate(reader, start=2):
            if not r["title"].strip() or not r["label"].strip():
                raise SystemExit(f"links.csv:{n}: title and label are required")
            if r["kind"] not in LINK_KINDS:
                raise SystemExit(f"links.csv:{n}: kind must be one of {sorted(LINK_KINDS)}")
            if not r["url"].startswith("https://"):
                raise SystemExit(f"links.csv:{n}: url must start with https://")
            out.setdefault(norm(r["title"]), []).append(r)
    return out


def media_for(title, media):
    key = norm(title)
    hit = max((k for k in media if key == k or key.startswith(k + " ")), key=len, default=None)
    return media.get(hit)


def icon(name):
    return f'<svg aria-hidden="true"><use href="#i-{name}"/></svg>'


def media_html(title, media, links):
    """One quiet line of outside links: Listen, Video, Wiki, then any hand-added links."""
    m = media_for(title, media) or {"wiki_url": "", "listen_url": "", "video": "", "talks": "", "wiki_title": ""}
    key = norm(title)
    extra = links.get(max((k for k in links if key == k or key.startswith(k + " ")), key=len, default=None), [])
    found = []
    if m["listen_url"]:
        found.append(("listen", "Listen", m["listen_url"], f"Listen to {title} on OshoWorld"))
    if int(m["video"] or 0):
        query = urllib.parse.quote_plus("Osho " + re.sub(r"\s*\(.*?\)", "", m["wiki_title"]))
        found.append(("watch", "Video", f"https://www.youtube.com/results?search_query={query}", f"Search YouTube for {title}"))
    if m["wiki_url"]:
        found.append(("list", "Wiki", m["wiki_url"], f"{title} on the Sannyas Wiki"))
    for x in extra:
        found.append((LINK_KINDS[x["kind"]], x["label"], x["url"], f'{x["label"]}: {title}'))
    if not found:
        return ""
    items = "".join(
        f'<a href="{e(url)}" rel="noopener" aria-label="{e(name)}">{icon(ic)}{e(label)}</a>' for ic, label, url, name in found
    )
    return f'<span class="media">{items}</span>'


def series_size(title, media, row_talks):
    """The wiki's length of the whole series, when it is longer than this row."""
    m = media_for(title, media)
    if not m:
        return ""
    talks = int(m["talks"] or 0)
    if talks <= (row_talks or 0) or talks < 2:
        return ""
    hours = round(int(m["minutes"] or 0) / 60)
    text = f"of {talks}" + (f" \u00b7 {hours}\u00a0h" if hours else "")
    return f'<span class="series-size" title="The wiki lists {talks} talks in the whole series">{e(text)}</span>'


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


def raw_path(rings):
    """Outline in plain longitude and negated latitude; each map scales it with a transform."""
    return "".join("M" + "L".join(f"{lon:g},{-lat:g}" for lon, lat in ring) + "Z" for ring in rings)


def outline_use(win):
    """A <use> of the shared outline, mapped into this map's window by the same linear projection."""
    lo0, lo1, la0, la1, india = win
    if india:
        kx = math.cos(math.radians(23))
        scale = MAP_H / (la1 - la0)
        a = kx * scale
        return f'<use class="land" href="#o-india" transform="matrix({a:.4f} 0 0 {scale:.4f} {-lo0 * a:.2f} {la1 * scale:.2f})"/>'
    scale = MAP_W / (lo1 - lo0)
    return f'<use class="land" href="#o-world" transform="matrix({scale:.4f} 0 0 {scale:.4f} {-lo0 * scale:.2f} {la1 * scale:.2f})"/>'


def place_labels(ranked, points, limit=7, must=4):
    """Greedy label placement: try right, left, below, above; skip on collision.

    The first `must` towns (the towns line above the map) may sit over the dots
    of lower-ranked towns if nothing else fits, so the map always names them.
    """
    boxes, out = [], []

    def clash(box, own, strict=True):
        x0, y0, x1, y1 = box
        if x0 < 2 or y0 < 2 or x1 > MAP_W - 2 or y1 > MAP_H - 2:
            return True
        if any(x0 < bx1 and bx0 < x1 and y0 < by1 and by0 < y1 for bx0, by0, bx1, by1 in boxes):
            return True
        others = [t for t in points if t != own] if strict else ranked[:ranked.index(own)]
        return any(x0 - 2 < points[t][0] < x1 + 2 and y0 - 2 < points[t][1] < y1 + 2 for t in others)

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
        tries = [True, False] if ranked.index(town) < must else [True]
        done = False
        for strict in tries:
            for lx, ly, anchor, box in options:
                if not clash(box, town, strict):
                    placed.append((x, y))
                    boxes.append(box)
                    out.append(f'<text x="{lx:.1f}" y="{ly:.1f}" text-anchor="{anchor}">{e(town)}</text>')
                    done = True
                    break
            if done:
                break
    return out


def month_strip(year, rows, town):
    """For a one-place year: listed talks per month, by each row's start date."""
    counts, undated = [0] * 13, 0
    for r in rows:
        n = talk_number(r["talks"]) or 0
        m = month_of(r)
        if m:
            counts[m] += n
        else:
            undated += n
    top = max(counts) or 1
    cells = "".join(
        f'<li aria-label="{MONTHS[m]}: {counts[m]} talk{"s" if counts[m] != 1 else ""}">'
        f'<span class="bar" style="--v:{counts[m] / top:.2f}"></span>'
        f'<span class="c">{counts[m] or ""}</span><span class="m">{MONTHS[m][0]}<span class="rest">{MONTHS[m][1:3]}</span></span></li>'
        for m in range(1, 13)
    )
    extra = f" {undated} more have no month." if undated else ""
    return (
        f'<figure class="months"><p class="where">All in {e(town)}</p><ol aria-label="Listed talks by month, {e(year["label"])}">{cells}</ol>'
        f"<figcaption>Listed talks by month, counted from each entry's start date.{extra}</figcaption></figure>"
    )


def map_svg(year, rows, places, outlines):
    weight, camps, ranked = town_weights(rows)
    if not weight:
        return ""
    if len(weight) == 1:
        return month_strip(year, rows, ranked[0])
    win = window_for([places[t] for t in weight])
    proj = projector(win)
    land = outline_use(win)
    where = "central and northern India" if win[4] else "the world"
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
    route = ""
    if year.get("route"):
        order = []
        for r in rows:
            for t in r["town_list"]:
                if t not in order:
                    order.append(t)
        pts = " ".join("{:.1f},{:.1f}".format(*points[t]) for t in order)
        route = f'<polyline class="route" points="{pts}"/>'
        marks = [route] + marks
    n = len(weight)
    label = f"Map of {where} marking the {n} place{'s' if n != 1 else ''} with listed talks in {year['label']}"
    caption = "Places with listed talks." + (" Diamonds are camps." if camps else "") + (" The dashed line joins them in the order he spoke there." if route else "")
    return (
        f'<figure class="map"><svg viewBox="0 0 {MAP_W:.0f} {MAP_H:.0f}" role="img" aria-label="{e(label)}">'
        f'{land}' + "".join(marks) + "".join(labels) + "</svg>"
        f"<figcaption>{caption}</figcaption></figure>"
    )


# ---- page -----------------------------------------------------------------

UNSURE = (
    '<svg class="unsure" viewBox="0 0 16 16" role="img" aria-label="Marked uncertain in the source">'
    '<title>Marked uncertain in the source</title><circle cx="8" cy="8" r="6"/></svg>'
)

def unit_for(talks):
    n = talk_number(talks)
    if n is None:
        return ""
    return "talk" if n == 1 else "talks"


def month_of(r):
    m = re.match(r"\d{4}-(\d{2})", r["sort"])
    return int(m.group(1)) if m and m.group(1) != "00" else 0


MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]


def rows_html(rows, show_lang, media, links):
    """Rows in order, with a month divider in long years and repeated places marked."""
    out, last_month, last_place = [], None, None
    seen = set()
    dividers = len(rows) > 20
    for r in rows:
        month = month_of(r)
        if dividers and month and month != last_month:
            out.append(f'<tr class="month"><th colspan="4" scope="rowgroup">{MONTHS[month]}</th></tr>')
            last_month, last_place = month, None
        rid = "r-" + re.sub(r"[^0-9a-z]+", "-", r["sort"].lower())
        while rid in seen:
            rid += "x"
        seen.add(rid)
        out.append(row_html(r, show_lang, media, links, same_place=(r["place"] == last_place), rid=rid))
        last_place = r["place"]
    return "".join(out)


def row_html(r, show_lang, media, links, same_place=False, rid=""):
    note = r["note"].strip()
    label = KIND_LABEL.get(r["kind"])
    if label and label.split()[-1].lower().rstrip("s") not in (r["title"] + " " + note).lower():
        note = f"{label}. {note}" if note else label
    note_html = f'<span class="note">{e(note)}</span>' if note else ""
    lang = f' <span class="lang" data-l="{r["lang"]}">{LANGS[r["lang"]]}</span>' if show_lang and r["lang"] else ""
    mark = UNSURE if r["unsure"] else ""
    words = r["title"].split(" ")
    tail = 2 if len(words) > 2 and re.fullmatch(r"[\d,]+", words[-1]) else 1
    head, last = " ".join(words[:-tail]), "\u00a0".join(words[-tail:])
    title_html = (e(head + " ") if head else "") + f'<span class="keep">{e(last)}{lang}</span>'
    if same_place:
        place_cell = f'<td class="place same"><span class="vh">{e(r["place"])}</span><span aria-hidden="true" title="Same place as above">\u3003</span></td>'
    else:
        place_cell = f'<td class="place">{e(r["place"])}</td>'
    return (
        f'<tr class="{r["kind"]}" id="{rid}">'
        f'<td class="dates">{e(r["dates"])}{mark}</td>'
        f'<td class="what"><span class="title">{title_html}</span>{note_html}'
        f'<span class="place-inline">{e(r["place"])}</span>{media_html(r["title"], media, links)}</td>'
        f'{place_cell}'
        f'<td class="talks"><span class="n" data-unit="{unit_for(r["talks"])}">{e(r["talks"])}</span>'
        f'{series_size(r["title"], media, talk_number(r["talks"]))}</td></tr>'
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
        f'<div class="plate"><img src="assets/img/{e(p["file"])}" alt="{e(p["alt"])}" loading="lazy" width="800" height="533" decoding="async"></div>'
        f'<figcaption>{e(p["caption"])} <span class="credit">{e(p.get("credit", "Recent photograph by"))} {e(p["author"])}, '
        f'<a href="{e(p["licence_url"])}">{e(p["licence"])}</a>, via <a href="{e(p["source_url"])}">Wikimedia Commons</a>.</span></figcaption>'
        "</figure>"
    )


def year_html(year, rows, places, outlines, media, links):
    summary, show_lang = summary_for(rows)
    _, _, ranked = town_weights(rows)
    towns_line = " ".join(f'<span class="keep">{"· " if i else ""}{e(t)}</span>' for i, t in enumerate(ranked[:4]))
    sub = f'<span class="sub">{e(year["numeral_sub"])}</span>' if year.get("numeral_sub") else ""
    photo = photo_html(year.get("photo"))
    closing, table, key = year_parts(year, rows, show_lang, media, links)
    yid = e(year["id"])
    return f"""
<section class="year" id="y-{yid}" aria-labelledby="h-{yid}">
  <div class="rail">
    <span class="stud" aria-hidden="true"></span>
    <div class="rail-in">
    <h2 id="h-{yid}"><span class="num">{e(year['numeral'])}</span>{sub}</h2>
    <p class="towns">{towns_line}</p>
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
    {closing if closing else table}
    <p class="source">Source: <a href="{e(year['source'])}">Sannyas Wiki, Osho Timeline, {e(year['label'])}</a></p>
    {"" if closing else key}
  </div>
</section>"""


def year_table(year, rows, show_lang, media, links):
    return f"""<table>
      <caption>Discourses, {e(year['label'])}, in date order</caption>
      <thead><tr><th scope="col" class="dates">Dates</th><th scope="col">Series or talk</th><th scope="col" class="place">Place</th><th scope="col" class="talks">Talks</th></tr></thead>
      <tbody>{rows_html(rows, show_lang, media, links)}</tbody>
    </table>"""


KEY = ('<p class="key"><b>Heavier type</b> is a titled series. <span class="swatch">Green</span> is a meditation camp. '
       f'{UNSURE} is uncertain in the source. "of 44" is the length of the whole series on the wiki.</p>')


def closing_html(year):
    c = year["closing"]
    parts = "".join(f'<p class="when">{e(w)}</p><p class="what">{e(t)}</p>' for w, t in c)
    return f'<div class="closing">{parts}</div>'


def year_parts(year, rows, show_lang, media, links):
    closing = closing_html(year) if year.get("closing") else ""
    return closing, year_table(year, rows, show_lang, media, links), KEY


def asset_version(name):
    """Short content hash, so a changed stylesheet or script is never served from a stale cache."""
    return hashlib.sha256((ROOT / "assets" / name).read_bytes()).hexdigest()[:10]


def page(years, sections, grand, outlines):
    span = f"{years[0]['numeral']} to {years[-1]['numeral']}"
    nav, decade = [], None
    for y in years:
        d = y["id"][:3] if y["id"].isdigit() else None
        if d and d != decade and decade is not None or (d and decade is None and y is not years[0]):
            nav.append(f'<span class="decade" aria-hidden="true">{d[2]}0s</span>')
        decade = d or decade
        nav.append(f'<a href="#y-{e(y["id"])}" aria-label="{e(y["label"])}">{e(y["nav"])}</a>')
    nav = "".join(nav)
    sources = "".join(f'<li><a href="{e(u)}">{e(t)}</a></li>' for t, u in SOURCES)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Osho: the discourses, {span}</title>
<meta name="description" content="A chronology of Osho's discourses from {span}: series, dates, places and talk counts, compiled from the Sannyas Wiki year timelines.">
<link rel="canonical" href="{SITE}">
<meta property="og:url" content="{SITE}">
<meta property="og:title" content="Osho: the discourses, {span}">
<meta property="og:description" content="Every discourse listed on the Sannyas Wiki, in date order: the series, the place and the number of talks.">
<meta property="og:type" content="website">
<meta name="theme-color" content="#1F3A6B">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231F3A6B'/%3E%3Ccircle cx='16' cy='16' r='10' fill='%23E9A21A'/%3E%3Ccircle cx='16' cy='16' r='5' fill='%23C2281D'/%3E%3C/svg%3E">
<link rel="preload" href="assets/fonts/yatra-one-latin-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css?v={asset_version('site.css')}">
</head>
<body>
<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false">
<defs><path id="o-india" d="{outlines['india_d']}"/><path id="o-world" d="{outlines['world_d']}"/></defs>
<symbol id="i-listen" viewBox="0 0 16 16"><path d="M8 1a6 6 0 0 0-6 6v5a2 2 0 0 0 2 2h1V8H3.5V7a4.5 4.5 0 0 1 9 0v1H11v6h1a2 2 0 0 0 2-2V7a6 6 0 0 0-6-6z"/></symbol>
<symbol id="i-watch" viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z"/></symbol>
<symbol id="i-list" viewBox="0 0 16 16"><path d="M2 3h12v2H2zm0 4h12v2H2zm0 4h8v2H2z"/></symbol>
</svg>
<a class="skip" href="#main">Skip to the chronology</a>
<header class="mast">
  <h1>Osho: the discourses<br><span>{span}</span></h1>
  <div class="intro-side">
  <p>Every discourse listed on the Sannyas Wiki, in date order: the series, the place and the number of talks. {grand['rows']} entries across {grand['towns']} places.</p>
  <form class="find" role="search" hidden>
    <label for="find">Find a series</label>
    <input id="find" type="search" autocomplete="off" spellcheck="false" placeholder="Beyond Psychology, Geeta-Darshan" aria-controls="find-results" aria-describedby="find-count">
    <p id="find-count" class="find-count" aria-live="polite"></p>
    <ol id="find-results" class="find-results"></ol>
  </form>
  </div>
</header>
<nav class="years" aria-label="Years">{nav}<a href="#sources">Sources</a></nav>
<main id="main">
<section class="reading" aria-labelledby="h-reading">
  <h2 id="h-reading">How to read this</h2>
  <p class="notice">{NOTICE}</p>
  <ul class="caveats">
    <li>Counts are rows on the Sannyas Wiki, not verified totals. "At least" and "about" are the source's own words.</li>
    <li>Many early titles are later book compilations of talks given in different towns, so one series can span months and cities.</li>
    <li>Titles are romanised as on the wiki. Where a year mixes Hindi and English, each row says which.</li>
    <li>This site hosts no recordings. <b>Listen</b> goes to <a href="https://oshoworld.com/audio" rel="noopener">OshoWorld</a>, <b>Wiki</b> to the series on the Sannyas Wiki, and <b>Video</b>, shown where the wiki lists video, to a YouTube search rather than a specific recording. OSHO International publishes the official recordings at <a href="https://www.osho.com/" rel="noopener">osho.com</a> and on its <a href="https://www.youtube.com/oshointernational" rel="noopener">YouTube channel</a>.</li>
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
      <p>The site is open source. <a href="{REPO}">See the code and data on GitHub</a>, <a href="{REPO}/issues/new/choose">suggest a correction or a link</a>, or read <a href="{REPO}/blob/main/CONTRIBUTING.md">how to contribute</a>.</p>
      <p>Map outlines are from Natural Earth (public domain). Positions are approximate. Photographs are credited beside each one. All are recent and reused under Creative Commons licences, except the 1983 photograph of Rajneeshpuram, which its photographer releases for any use with attribution. Type is Yatra One and Hind, both under the SIL Open Font License.</p>
    </div>
  </div>
</footer>
<script src="assets/site.js?v={asset_version('site.js')}" defer></script>
</body>
</html>
"""


def main():
    places = load_places()
    media = load_media()
    links = load_links()
    years = json.loads((DATA / "years.json").read_text(encoding="utf-8"))
    outlines = {
        "india": json.loads((DATA / "india-outline.json").read_text(encoding="utf-8"))["ring"],
        "world": json.loads((DATA / "world-outline.json").read_text(encoding="utf-8"))["rings"],
    }
    outlines["india_d"] = raw_path([outlines["india"]])
    outlines["world_d"] = raw_path(outlines["world"])
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
        sections.append(year_html(y, rows, places, outlines, media, links))
    row_keys = [norm(r["title"]) for r in all_rows]
    for key, items in links.items():
        if not any(k == key or k.startswith(key + " ") for k in row_keys):
            raise SystemExit(f"links.csv: no series is titled {items[0]['title']!r}")
    grand = {"rows": len(all_rows), "towns": len({t for r in all_rows for t in r["town_list"]})}
    # Empty _site/ rather than delete it, so a local server serving it keeps working.
    OUT.mkdir(exist_ok=True)
    for child in OUT.iterdir():
        shutil.rmtree(child) if child.is_dir() else child.unlink()
    shutil.copytree(ROOT / "assets", OUT / "assets")
    (OUT / ".nojekyll").write_text("")
    (OUT / "index.html").write_text(page(years, sections, grand, outlines), encoding="utf-8")
    print(f"built _site/index.html: {grand['rows']} entries, {grand['towns']} places, {len(years)} sections")


if __name__ == "__main__":
    main()
