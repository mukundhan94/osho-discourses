#!/usr/bin/env python3
"""Build the site into _site/ from data/ and assets/. Standard library only.

Usage: python3 scripts/build.py
"""
import csv
import datetime
import hashlib
import html
import json
import math
import re
import shutil
import subprocess
import sys
import urllib.parse
import zlib
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
# The picture shown when the site is shared. assets/og/ holds the alternatives.
OG_IMAGE = "assets/og/medallion.png"
OG_IMAGE_ALT = "Osho: the discourses, 1954 to 1990, a year-by-year chronology"
OG_SIZE = (1200, 630)
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


def row_ids(rows):
    """The id each row carries on the page, in row order. Rows that share a sort key get an x added."""
    out, seen = [], set()
    for r in rows:
        rid = "r-" + re.sub(r"[^0-9a-z]+", "-", r["sort"].lower())
        while rid in seen:
            rid += "x"
        seen.add(rid)
        out.append(rid)
    return out


def rows_html(rows, show_lang, media, links, series_urls=None):
    """Rows in order, with a month divider in long years and repeated places marked."""
    out, last_month, last_place = [], None, None
    dividers = len(rows) > 20
    for r, rid in zip(rows, row_ids(rows)):
        month = month_of(r)
        if dividers and month and month != last_month:
            out.append(f'<tr class="month"><th colspan="4" scope="rowgroup">{MONTHS[month]}</th></tr>')
            last_month, last_place = month, None
        out.append(row_html(r, show_lang, media, links, same_place=(r["place"] == last_place), rid=rid, series_urls=series_urls))
        last_place = r["place"]
    return "".join(out)


def row_html(r, show_lang, media, links, same_place=False, rid="", series_urls=None):
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
    # Only pages beside the home page pass series_urls; there the title leads to the series page.
    found = media_for(r["title"], media) if series_urls else None
    if found and found["key"] in series_urls:
        title_html = f'<a href="{e(series_urls[found["key"]])}">{title_html}</a>'
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


def year_html(year, rows, places, outlines, media, links, series_urls=None):
    summary, show_lang = summary_for(rows)
    _, _, ranked = town_weights(rows)
    towns_line = " ".join(f'<span class="keep">{"· " if i else ""}{e(t)}</span>' for i, t in enumerate(ranked[:4]))
    sub = f'<span class="sub">{e(year["numeral_sub"])}</span>' if year.get("numeral_sub") else ""
    photo = photo_html(year.get("photo"))
    closing, table, key = year_parts(year, rows, show_lang, media, links, series_urls)
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


def year_table(year, rows, show_lang, media, links, series_urls=None):
    return f"""<table>
      <caption>Discourses, {e(year['label'])}, in date order</caption>
      <thead><tr><th scope="col" class="dates">Dates</th><th scope="col">Series or talk</th><th scope="col" class="place">Place</th><th scope="col" class="talks">Talks</th></tr></thead>
      <tbody>{rows_html(rows, show_lang, media, links, series_urls)}</tbody>
    </table>"""


KEY = ('<p class="key"><b>Heavier type</b> is a titled series. <span class="swatch">Green</span> is a meditation camp. '
       f'{UNSURE} is uncertain in the source. "of 44" is the length of the whole series on the wiki.</p>')


def closing_html(year):
    c = year["closing"]
    parts = "".join(f'<p class="when">{e(w)}</p><p class="what">{e(t)}</p>' for w, t in c)
    return f'<div class="closing">{parts}</div>'


def year_parts(year, rows, show_lang, media, links, series_urls=None):
    closing = closing_html(year) if year.get("closing") else ""
    return closing, year_table(year, rows, show_lang, media, links, series_urls), KEY


def git(*args):
    try:
        return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, timeout=10, check=True).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


# Everything the home page is built from. A commit to any of these changes the page.
PAGE_SOURCES = ("data", "assets", "scripts/build.py")


def page_lastmod():
    """Date the home page last changed, for the sitemap, and where that date came from.

    In a shallow clone the oldest commit looks as if it added every file, so a
    date read from it is only an upper bound. Without git, use today's date.
    """
    found = git("log", "-1", "--format=%H %cs", "--", *PAGE_SOURCES)
    if not re.fullmatch(r"[0-9a-f]{40} \d{4}-\d{2}-\d{2}", found):
        return datetime.date.today().isoformat(), "build date (git history not available)"
    commit, date = found.split()
    shallow_file = git("rev-parse", "--git-path", "shallow")
    boundary = (ROOT / shallow_file).read_text().split() if shallow_file and (ROOT / shallow_file).exists() else []
    if commit in boundary:
        return date, "oldest commit in a shallow clone (the page changed on or before this date)"
    return date, "last commit touching " + ", ".join(PAGE_SOURCES)


def sitemap_xml(urls, lastmod):
    items = "".join(f"  <url><loc>{e(u)}</loc><lastmod>{lastmod}</lastmod></url>\n" for u in urls)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + items + "</urlset>\n")


def asset_version(name):
    """Short content hash, so a changed stylesheet or script is never served from a stale cache."""
    return hashlib.sha256((ROOT / "assets" / name).read_bytes()).hexdigest()[:10]


TOUR = [
    ("row", "indigo", "Each row is a series", [
        "When, where, and how many talks. <b>Bold titles</b> are named series, and plain ones are talks named by town.",
        "Some titles are later books that gather talks from several places. Where a year has both Hindi and English, a tag says which.",
    ]),
    ("camp", "leaf", "Green means a camp", [
        "Green rows are meditation camps, like the first one at Ranakpur in June 1964. On the maps, camps are green diamonds.",
    ]),
    ("count", "madder", "Counts come from the wiki", [
        "14 talks here, <b>15</b> in the whole series. The numbers count rows on the Sannyas Wiki, so they are a guide, not a checked total.",
        "A dashed ring means the wiki is unsure of a date, place or count.",
    ]),
    ("links", "turmeric", "Links go elsewhere", [
        "<b>Listen</b> plays free MP3s on OshoWorld. <b>Video</b> searches YouTube, and <b>Wiki</b> opens the series page.",
        'Official recordings are at <a href="https://www.osho.com/" rel="noopener">osho.com</a>. Nothing is hosted or sold here.',
    ]),
]

TOUR_ICONS = {
    "row": '<path d="M3 6h18M3 12h18M3 18h11" />',
    "camp": '<path d="M12 3l7 9-7 9-7-9z" />',
    "count": '<circle cx="12" cy="12" r="8" stroke-dasharray="4 3" /><path d="M9 12h6M12 9v6" />',
    "links": '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />',
}


def tour_html(sample_rows):
    cards = "".join(
        f'<li class="tcard t-{tone}" data-focus="{focus}" id="tour-{n}">'
        f'<svg class="ticon" viewBox="0 0 24 24" aria-hidden="true">{TOUR_ICONS[focus]}</svg>'
        f'<h3><span class="tnum" aria-hidden="true">{n}</span><span>{e(head)}</span></h3>{"".join(f"<p>{t}</p>" for t in text)}</li>'
        for n, (focus, tone, head, text) in enumerate(TOUR, 1)
    )
    return f"""<div class="tour" data-tour>
    <div class="tour-cards">
      <ol class="tcards" aria-label="Four things to know before reading">{cards}</ol>
      <div class="tnav" hidden>
        <button type="button" class="tback">Back</button>
        <span class="tdots" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <button type="button" class="tnext">Next</button>
      </div>
    </div>
    <div class="tour-stage body" aria-label="Three example rows from 1964">
      <table><caption>Example rows from 1964</caption><tbody>{sample_rows}</tbody></table>
    </div>
  </div>"""


def json_ld(years):
    """Structured data for search engines: what the site is, and the collection it holds."""
    first, last = years[0]["numeral"], years[-1]["numeral"]
    # [0-9], not \d: \d also accepts digits from other scripts, which are not valid in a date.
    if not (re.fullmatch(r"[0-9]{4}", first) and re.fullmatch(r"[0-9]{4}", last)) or first > last:
        raise SystemExit(f"years.json: the first and last numerals must be years in order, got {first!r} and {last!r}")
    graph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": f"{SITE}#website",
                "name": "Osho: the discourses",
                "url": SITE,
                "description": "A free, non-commercial library of when and where Osho spoke, "
                               f"year by year from {first} to {last}, with links to recordings hosted by others.",
                "inLanguage": "en",
            },
            {
                "@type": "Dataset",
                "@id": f"{SITE}#dataset",
                "name": f"Chronology of Osho's discourses, {first} to {last}",
                "description": f"Every discourse listed on the Sannyas Wiki year timelines from {first} to {last}, "
                               "in date order: the series, the dates, the place and the number of talks.",
                "url": SITE,
                "license": "https://creativecommons.org/licenses/by-nc-nd/4.0/",
                "temporalCoverage": f"{first}/{last}",
                "creator": {"@type": "Organization", "name": "oshodiscourses.com", "url": SITE},
                "isBasedOn": WIKI,
                "isAccessibleForFree": True,
            },
        ],
    }
    text = json.dumps(graph, ensure_ascii=False, separators=(",", ":"))
    if json.loads(text) != graph:
        raise SystemExit("json-ld: the structured data does not survive a round trip")
    # "<" cannot end the script element early once it is written as an escape.
    return '<script type="application/ld+json">' + text.replace("<", "\\u003c") + "</script>"


def year_band(years, href, current=None, last=""):
    """The row of year pills. `href` gives each year's address; `current` marks the page being read."""
    nav, decade = [], None
    for y in years:
        d = y["id"][:3] if y["id"].isdigit() else None
        if d and d != decade and decade is not None or (d and decade is None and y is not years[0]):
            nav.append(f'<span class="decade" aria-hidden="true">{d[2]}0s</span>')
        decade = d or decade
        here = ' aria-current="page"' if y["id"] == current else ""
        nav.append(f'<a href="{e(href(y))}" aria-label="{e(y["label"])}"{here}>{e(y["nav"])}</a>')
    return f'<nav class="years" aria-label="Years">{"".join(nav)}{last}</nav>'


def head_html(title, description, canonical, og_title, og_description, ld, root="", extra_css=()):
    """The <head> every page shares. `root` is "" on the home page and "/" on pages in folders."""
    # Escape what a double-quoted attribute needs and leave apostrophes as typed.
    title, description, og_title, og_description = (
        html.escape(t, quote=False).replace('"', "&quot;") for t in (title, description, og_title, og_description))
    css = "".join(f'\n<link rel="stylesheet" href="{root}assets/{name}?v={asset_version(name)}">' for name in extra_css)
    return f"""<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{canonical}">
<meta property="og:url" content="{canonical}">
<meta property="og:title" content="{og_title}">
<meta property="og:description" content="{og_description}">
<meta property="og:type" content="website">
<meta property="og:image" content="{SITE}{OG_IMAGE}?v={asset_version(OG_IMAGE[len('assets/'):])}">
<meta property="og:image:width" content="{OG_SIZE[0]}">
<meta property="og:image:height" content="{OG_SIZE[1]}">
<meta property="og:image:alt" content="{e(OG_IMAGE_ALT)}">
<meta name="twitter:card" content="summary_large_image">
{ld}
<meta name="theme-color" content="#1F3A6B">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231F3A6B'/%3E%3Ccircle cx='16' cy='16' r='10' fill='%23E9A21A'/%3E%3Ccircle cx='16' cy='16' r='5' fill='%23C2281D'/%3E%3C/svg%3E">
<link rel="preload" href="{root}assets/fonts/yatra-one-latin-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{root}assets/site.css?v={asset_version('site.css')}">{css}
</head>"""


def sprite_html(outlines, need=("india", "world")):
    """Shared shapes: the map outlines a page uses, and the link icons."""
    defs = "".join(f'<path id="o-{n}" d="{outlines[n + "_d"]}"/>' for n in need)
    return f"""<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false">
<defs>{defs}</defs>
<symbol id="i-listen" viewBox="0 0 16 16"><path d="M8 1a6 6 0 0 0-6 6v5a2 2 0 0 0 2 2h1V8H3.5V7a4.5 4.5 0 0 1 9 0v1H11v6h1a2 2 0 0 0 2-2V7a6 6 0 0 0-6-6z"/></symbol>
<symbol id="i-watch" viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z"/></symbol>
<symbol id="i-list" viewBox="0 0 16 16"><path d="M2 3h12v2H2zm0 4h12v2H2zm0 4h8v2H2z"/></symbol>
</svg>
"""


def footer_html():
    sources = "".join(f'<li><a href="{e(u)}">{e(t)}</a></li>' for t, u in SOURCES)
    return f"""<footer id="sources">
  <h2>Sources</h2>
  <div class="cols">
    <div>
      <ul class="links">{sources}</ul>
    </div>
    <div>
      <p>Compiled in November 2026. Each year links to its wiki page under its table. The wiki is the authority for every row. Where this page and the wiki differ, the wiki is right and this page needs correcting.</p>
      <p>The site is open source. <a href="{REPO}">See the code and data on GitHub</a>, <a href="{REPO}/issues/new/choose">suggest a correction or a link</a>, or read <a href="{REPO}/blob/main/CONTRIBUTING.md">how to contribute</a>.</p>
      <p>Visits are counted with Vercel Web Analytics, which records anonymous page views without third-party cookies. Vercel Speed Insights measures how fast the page loads.</p>
      <p>Map outlines are from Natural Earth (public domain). Positions are approximate. Photographs are credited beside each one. All are recent and reused under Creative Commons licences, except the 1983 photograph of Rajneeshpuram, which its photographer releases for any use with attribution. Type is Yatra One and Hind, both under the SIL Open Font License.</p>
    </div>
  </div>
</footer>
"""


ANALYTICS = """<script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };</script>
<script defer src="/_vercel/insights/script.js"></script>
<script defer src="/_vercel/speed-insights/script.js"></script>
"""


def page(years, sections, grand, outlines, tour):
    span = f"{years[0]['numeral']} to {years[-1]['numeral']}"
    band = year_band(years, lambda y: "#y-" + y["id"], last='<a href="#sources">Sources</a>')
    head = head_html(
        f"Osho: the discourses, {span}",
        f"A chronology of Osho's discourses from {span}: series, dates, places and talk counts, compiled from the Sannyas Wiki year timelines.",
        SITE,
        f"Osho: the discourses, {span}",
        "Every discourse listed on the Sannyas Wiki, in date order: the series, the place and the number of talks.",
        json_ld(years),
    )
    return f"""<!doctype html>
<html lang="en">
{head}
<body>
{sprite_html(outlines)}<a class="skip" href="#main">Skip to the chronology</a>
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
{band}
<main id="main">
<section class="reading" aria-labelledby="h-reading">
  <h2 id="h-reading" class="vh">How to read this page</h2>
  <p class="lead">A free, non-commercial library of when and where Osho spoke.
  <small>Nothing here is for sale. Recordings are linked, never stored here.</small></p>
  {tour}
</section>
{''.join(sections)}
</main>
{footer_html()}<script src="assets/site.js?v={asset_version('site.js')}" defer></script>
{ANALYTICS}</body>
</html>
"""


def year_url(year):
    return f"year/{year['id']}/"


def year_title(year):
    """Page title for one year. A single year reads "in 1975"; a range reads ", 1954 to 1963"."""
    when = f"in {year['label']}" if re.fullmatch(r"[0-9]{4}", year["label"]) else f"from {year['label']}"
    return f"Osho discourses {when}: {year['heading']}"


def clip(text, limit=155):
    """Shorten to a whole number of words within `limit` characters, for a meta description."""
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(" ,;:.")
    return cut + "\u2026"


def year_page(year, section, years, outlines, parts=()):
    """One year on its own address: the same section the home page shows, with its own head."""
    at = years.index(year)
    url = SITE + year_url(year)
    title, description = year_title(year), clip(year["lede"])
    ld = json.dumps({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": url,
        "url": url,
        "name": title,
        "description": description,
        "inLanguage": "en",
        "isPartOf": {"@id": f"{SITE}#website"},
        **({"hasPart": [{"@id": u} for u in parts]} if parts else {}),
    }, ensure_ascii=False, separators=(",", ":"))
    json.loads(ld)
    ld = '<script type="application/ld+json">' + ld.replace("<", "\\u003c") + "</script>"
    head = head_html(title, description, url, title, description, ld, root="/", extra_css=("pages.css",))
    band = year_band(years, lambda y: "/" + year_url(y), current=year["id"], last='<a href="/">All years</a>')
    # The section is the home page's own markup. Only its picture addresses change, and the
    # rail stud is inked in, which the home page does with its script as the year scrolls by.
    section = section.replace('="assets/', '="/assets/').replace('<section class="year"', '<section class="year arrived"', 1)
    def step(y, rel, word):
        if y is None:
            return "<span></span>"
        return (f'<a rel="{rel}" href="/{e(year_url(y))}"><small>{word}</small>'
                f'<b>{e(y["label"])}</b><span>{e(y["heading"])}</span></a>')
    earlier = years[at - 1] if at else None
    later = years[at + 1] if at + 1 < len(years) else None
    return f"""<!doctype html>
<html lang="en">
{head}
<body>
{sprite_html(outlines, outlines_used(section))}<a class="skip" href="#main">Skip to the year</a>
<header class="mast sub">
  <h1><a href="/">Osho: the discourses</a><br><span>{e(year['label'])}</span></h1>
  <div class="intro-side">
  <p>Part of a chronology of every discourse listed on the Sannyas Wiki. <a href="/#y-{e(year['id'])}">See it among all {len(years)} years</a>.</p>
  </div>
</header>
{band}
<main id="main" class="solo">
{section}
<nav class="pager" aria-label="Earlier and later years">
{step(earlier, "prev", "Earlier")}
{step(later, "next", "Later")}
</nav>
</main>
{footer_html()}{BAND_SCRIPT}
{ANALYTICS}</body>
</html>
"""


BAND_SCRIPT = """<script>(function () {
  var here = document.querySelector('.years [aria-current]');
  if (here) here.parentNode.scrollLeft = here.offsetLeft - (here.parentNode.clientWidth - here.offsetWidth) / 2;
})();</script>"""


def outlines_used(markup):
    return tuple(n for n in ("india", "world") if f'href="#o-{n}"' in markup)


# ---- series pages ----------------------------------------------------------

SERIES_WORD = {"series": "discourse series", "camp": "meditation camp talks", "darshan": "darshan diary",
               "interview": "press interviews", "untitled": "talks"}


def collect_series(years, rows_by_year, media):
    """Every titled series with the rows that belong to it, oldest first.

    A row belongs to the series media.csv matches it to, the same match the row's links use.
    """
    found = {}
    for y in years:
        rows = rows_by_year[y["id"]]
        for r, rid in zip(rows, row_ids(rows)):
            m = media_for(r["title"], media)
            if m:
                found.setdefault(m["key"], {"key": m["key"], "media": m, "entries": []})["entries"].append((y, r, rid))
    out = sorted(found.values(), key=lambda x: (x["entries"][0][1]["sort"], x["key"]))
    for x in out:
        first = x["entries"][0][1]["title"]
        # Prefer the wiki's spelling without its script gloss or part number; fall back to the row's title.
        wiki = re.sub(r"\s*~\s*\d+\s*$", "", re.sub(r"\s*\([^)]*[^\x00-\x7f][^)]*\)", "", x["media"]["wiki_title"])).strip()
        row = re.sub(r",\s*\d[\d ,toand]*$", "", first).strip()
        x["name"] = wiki if norm(wiki) == x["key"] else row
        if norm(x["name"]) != x["key"]:
            raise SystemExit(f"series {x['key']!r}: cannot work out a display name from {first!r}")
        kinds = [r["kind"] for _, r, _ in x["entries"]]
        x["kind"] = max(set(kinds), key=lambda k: (kinds.count(k), k))
        ids = [y["id"] for y, _, _ in x["entries"]]
        x["years"] = [y for y in years if y["id"] in ids]
        a, b = x["entries"][0][1]["sort"][:4], x["entries"][-1][1]["sort"][:4]
        x["span"] = a if a == b else f"{a} to {b}"
    return out


def load_slugs(series, add=False):
    """The address of each series page, frozen in data/slugs.csv so a published address never moves."""
    path = DATA / "slugs.csv"
    slugs = {}
    if path.exists():
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            if reader.fieldnames != ["key", "slug"]:
                raise SystemExit("slugs.csv: header must be key,slug")
            for n, r in enumerate(reader, start=2):
                if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", r["slug"] or ""):
                    raise SystemExit(f"slugs.csv:{n}: slug must be lower-case letters and digits joined by hyphens")
                if r["key"] in slugs or r["slug"] in slugs.values():
                    raise SystemExit(f"slugs.csv:{n}: key or slug is used more than once")
                slugs[r["key"]] = r["slug"]
    keys = {x["key"] for x in series}
    missing = sorted(keys - set(slugs))
    if missing and add:
        for key in missing:
            slug = re.sub(r"[^a-z0-9]+", "-", key).strip("-")
            if slug in slugs.values():
                raise SystemExit(f"slugs.csv: {key!r} would repeat the slug {slug!r}; add its row by hand")
            slugs[key] = slug
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f, lineterminator="\n")
            w.writerow(["key", "slug"])
            w.writerows(sorted(slugs.items()))
        print(f"slugs.csv: added {len(missing)} series")
    elif missing:
        raise SystemExit(f"slugs.csv: {len(missing)} series have no address yet, the first is {missing[0]!r}. Run `make slugs`.")
    gone = sorted(set(slugs) - keys)
    if gone:
        raise SystemExit(f"slugs.csv: {gone[0]!r} is no longer a series. Its page is public, so add a redirect "
                         "for /series/" + slugs[gone[0]] + "/ in vercel.json, then remove its row.")
    return slugs


def series_url(x):
    return f"series/{x['slug']}/"


def series_when(r):
    """A row's dates with its year, as a phrase that follows a comma."""
    year = r["sort"][:4]
    dates = r["dates"].strip()
    if dates == year:
        return f"in {year}"
    return dates if re.search(r"\d{4}", dates) else f"{dates} {year}"


def series_lede(x):
    """One or two plain sentences on what the series is, built only from its rows and media.csv."""
    rows = [r for _, r, _ in x["entries"]]
    known, open_rows = totals(rows)
    count = f"{known} talk{'' if known == 1 else 's'}" if known and not open_rows else (f"At least {known} talks" if known else "Talks")
    langs = {r["lang"] for r in rows if r["lang"]}
    lang = " in Hindi" if langs == {"hi"} else " in English" if langs == {"en"} else ""
    label = KIND_LABEL.get(x["kind"])
    lead = f"{label}. " if label else ""
    if len(rows) == 1:
        text = f"{lead}{count}{lang} at {rows[0]['place']}, {series_when(rows[0])}."
    else:
        _, _, ranked = town_weights(rows)
        towns = ", ".join(ranked[:3]) + (" and elsewhere" if len(ranked) > 3 else "")
        when = f"in {x['span']}" if " to " not in x["span"] else f"from {x['span']}"
        text = f"{lead}{count}{lang} listed in {len(rows)} entries {when}, at {towns}."
    whole = int(x["media"]["talks"] or 0)
    if whole > known and whole > 1:
        text += f" The wiki lists {whole} talks in the whole series."
    return text


def series_page(x, earlier, later, years, places, outlines, media, links):
    """One series on its own address: every row it has across the years, with the same links."""
    rows = [r for _, r, _ in x["entries"]]
    url = SITE + series_url(x)
    lede = series_lede(x)
    title = f"{x['name']} ({x['span']}), Osho {SERIES_WORD[x['kind']]}"
    description = clip(f"{x['name']}: {lede}")
    first_year, first_row, first_rid = x["entries"][0]
    langs = {r["lang"] for r in rows if r["lang"]}
    towns = {t for r in rows for t in r["town_list"]}
    data = {
        "@context": "https://schema.org",
        "@type": "CreativeWorkSeries",
        "@id": url,
        "url": url,
        "name": x["name"],
        "description": description,
        "author": {"@type": "Person", "name": "Osho"},
        "isPartOf": {"@id": f"{SITE}#website"},
    }
    if len(langs) == 1:
        data["inLanguage"] = next(iter(langs))
    if re.fullmatch(r"\d{4}(-\d{2}){0,2}", first_row["sort"][:10].rstrip("abcdefgh")):
        data["startDate"] = first_row["sort"][:10].rstrip("abcdefgh")
    if len({r["place"] for r in rows}) == 1:
        data["locationCreated"] = {"@type": "Place", "name": rows[0]["place"]}
    if x["media"]["wiki_url"]:
        data["sameAs"] = x["media"]["wiki_url"]
    ld = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    json.loads(ld)
    ld = '<script type="application/ld+json">' + ld.replace("<", "\\u003c") + "</script>"
    head = head_html(title, description, url, title, description, ld, root="/", extra_css=("pages.css",))
    band = year_band(years, lambda y: "/" + year_url(y), current=first_year["id"], last='<a href="/">All years</a>')

    body_rows = []
    for y in x["years"]:
        mine = [(r, rid) for yy, r, rid in x["entries"] if yy is y]
        body_rows.append(f'<tr class="month"><th colspan="4" scope="rowgroup"><a href="/{e(year_url(y))}#{mine[0][1]}">{e(y["label"])}</a></th></tr>')
        last_place = None
        for r, rid in mine:
            body_rows.append(row_html(r, False, media, links, same_place=(r["place"] == last_place), rid=rid))
            last_place = r["place"]
    summary, _ = summary_for(rows)
    _, _, ranked = town_weights(rows)
    towns_line = " ".join(f'<span class="keep">{"· " if i else ""}{e(t)}</span>' for i, t in enumerate(ranked[:4]))
    a, b = x["span"].partition(" to ")[::2]
    sub = f'<span class="sub">to {b}</span>' if b else ""
    figure = map_svg({"label": x["span"]}, rows, places, outlines) if len(towns) > 1 else ""
    source = (f'<p class="source">Source: <a href="{e(x["media"]["wiki_url"])}">Sannyas Wiki, {e(x["name"])}</a></p>'
              if x["media"]["wiki_url"] else "")
    section = f"""
<section class="year arrived series" aria-labelledby="h-series">
  <div class="rail">
    <span class="stud" aria-hidden="true"></span>
    <div class="rail-in">
    <h2 id="h-when"><span class="num">{a}</span>{sub}</h2>
    <p class="towns">{towns_line}</p>
    <p class="summary">{e(summary)}</p>
    {figure}
    </div>
  </div>
  <div class="body">
    <div class="opener">
      <div class="intro">
        <h3 id="h-series">{e(x['name'])}</h3>
        <p class="lede">{e(lede)}</p>
      </div>
    </div>
    <table>
      <caption>{e(x['name'])}, in date order</caption>
      <thead><tr><th scope="col" class="dates">Dates</th><th scope="col">Series or talk</th><th scope="col" class="place">Place</th><th scope="col" class="talks">Talks</th></tr></thead>
      <tbody>{''.join(body_rows)}</tbody>
    </table>
    {source}
    {KEY}
  </div>
</section>"""

    def step(s, rel, word):
        if s is None:
            return "<span></span>"
        return (f'<a rel="{rel}" href="/{e(series_url(s))}"><small>{word}</small>'
                f'<b>{e(s["name"])}</b><span>{e(s["span"])}</span></a>')
    return f"""<!doctype html>
<html lang="en">
{head}
<body>
{sprite_html(outlines, outlines_used(section))}<a class="skip" href="#main">Skip to the series</a>
<header class="mast sub">
  <h1><a href="/">Osho: the discourses</a><br><span>{e(x['name'])}</span></h1>
  <div class="intro-side">
  <p>Part of a chronology of every discourse listed on the Sannyas Wiki. <a href="/{e(year_url(first_year))}#{first_rid}">See it in {e(first_year['label'])}</a>.</p>
  </div>
</header>
{band}
<main id="main" class="solo">
{section}
<nav class="pager" aria-label="Earlier and later series">
{step(earlier, "prev", "Earlier series")}
{step(later, "next", "Later series")}
</nav>
</main>
{footer_html()}{BAND_SCRIPT}
{ANALYTICS}</body>
</html>
"""


def check_pages(pages):
    """Every page needs its own title, description and canonical, and every link inside the site must lead to a file."""
    seen = {"title": {}, "description": {}, "canonical": {}}
    patterns = {
        "title": r"<title>(.*?)</title>",
        "description": r'<meta name="description" content="(.*?)">',
        "canonical": r'<link rel="canonical" href="(.*?)">',
    }
    for path, text in pages.items():
        for what, pattern in patterns.items():
            found = re.findall(pattern, text.split("</head>", 1)[0])  # the maps have <title> elements of their own
            if len(found) != 1 or not found[0]:
                raise SystemExit(f"{path}: needs exactly one {what}, found {len(found)}")
            if found[0] in seen[what]:
                raise SystemExit(f"{path}: has the same {what} as {seen[what][found[0]]}")
            seen[what][found[0]] = path
        folder = path.rsplit("/", 1)[0] + "/" if "/" in path else ""
        for link in set(re.findall(r'(?:href|src)="([^"#]*)', text)):
            if not link or re.match(r"[a-z]+:|//|/_vercel/", link):
                continue
            target = (link[1:] if link.startswith("/") else folder + link).split("?")[0]
            if target == "" or target.endswith("/"):
                target += "index.html"
            if not (OUT / target).is_file():
                raise SystemExit(f"{path}: links to {link}, which is not in _site/")


def check_og_image(path):
    """The shared picture must be a whole PNG of the size the tags declare, and small enough to load fast."""
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit(f"{OG_IMAGE}: not a PNG file")
    size = (int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big"))
    if size != OG_SIZE:
        raise SystemExit(f"{OG_IMAGE}: is {size[0]}x{size[1]}, must be {OG_SIZE[0]}x{OG_SIZE[1]}")
    if len(data) > 300_000:
        raise SystemExit(f"{OG_IMAGE}: is {len(data)} bytes, must be under 300 KB")
    # Walk every chunk: each carries its own checksum, and the pixels must inflate.
    pos, pixels, ended = 8, b"", False
    while pos + 12 <= len(data) and not ended:
        length, kind = int.from_bytes(data[pos:pos + 4], "big"), data[pos + 4:pos + 8]
        body, crc = data[pos + 8:pos + 8 + length], data[pos + 8 + length:pos + 12 + length]
        if len(body) != length or len(crc) != 4 or zlib.crc32(kind + body) != int.from_bytes(crc, "big"):
            break
        pixels += body if kind == b"IDAT" else b""
        ended = kind == b"IEND"
        pos += 12 + length
    try:
        zlib.decompress(pixels)
    except zlib.error:
        ended = False
    if not ended:
        raise SystemExit(f"{OG_IMAGE}: the PNG is cut short or damaged")


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
    sections, all_rows, rows_by_year = [], [], {}
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
        rows_by_year[y["id"]] = rows
        sections.append(year_html(y, rows, places, outlines, media, links))
    # Year pages take their address from the id and their neighbours from the order here.
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
    sample_src = load_rows("1964", places)
    pick = {"Mahaveer Ya Mahavinash, 3": "row links", "Sadhana Path": "camp count", "Talks in Nandurbar": "row"}
    sample = []
    for r in sample_src:
        if r["title"] in pick:
            html_row = row_html(r, False, media, links, rid="")
            html_row = html_row.replace(' id=""', f' data-tour-row="{pick[r["title"]]}"', 1)
            sample.append(html_row)
    tour = tour_html("".join(sample))
    grand = {"rows": len(all_rows), "towns": len({t for r in all_rows for t in r["town_list"]})}
    # Empty _site/ rather than delete it, so a local server serving it keeps working.
    OUT.mkdir(exist_ok=True)
    for child in OUT.iterdir():
        shutil.rmtree(child) if child.is_dir() else child.unlink()
    shutil.copytree(ROOT / "assets", OUT / "assets")
    check_og_image(OUT / OG_IMAGE)  # the copy that is published, not the one in assets/
    (OUT / ".nojekyll").write_text("")
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n", encoding="utf-8")
    lastmod, lastmod_source = page_lastmod()
    pages = {"index.html": page(years, sections, grand, outlines, tour)}
    series = collect_series(years, rows_by_year, media)
    slugs = load_slugs(series, add="--slugs" in sys.argv)
    for x in series:
        x["slug"] = slugs[x["key"]]
    series_urls = {x["key"]: "/" + series_url(x) for x in series}
    for y in years:
        # The home page's section again, this time with each series title leading to its page.
        section = year_html(y, rows_by_year[y["id"]], places, outlines, media, links, series_urls)
        parts = [SITE + series_url(x) for x in series if y in x["years"]]
        pages[year_url(y) + "index.html"] = year_page(y, section, years, outlines, parts)
    for n, x in enumerate(series):
        earlier = series[n - 1] if n else None
        later = series[n + 1] if n + 1 < len(series) else None
        pages[series_url(x) + "index.html"] = series_page(x, earlier, later, years, places, outlines, media, links)
    for path, text in pages.items():
        (OUT / path).parent.mkdir(parents=True, exist_ok=True)
        (OUT / path).write_text(text, encoding="utf-8")
    check_pages(pages)
    urls = [SITE + path[:-len("index.html")] for path in pages]
    (OUT / "sitemap.xml").write_text(sitemap_xml(urls, lastmod), encoding="utf-8")
    print(f"built _site/index.html: {grand['rows']} entries, {grand['towns']} places, {len(years)} sections")
    print(f"built {len(years)} year pages in _site/year/ and {len(series)} series pages in _site/series/")
    print(f"sitemap.xml: {len(urls)} URLs, lastmod {lastmod} from {lastmod_source}")


if __name__ == "__main__":
    main()
