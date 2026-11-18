#!/usr/bin/env python3
"""Compare two built copies of the site. Standard library only.

Usage: python3 scripts/parity_check.py [OLD] [NEW]
  OLD  the reference build (default: _site)
  NEW  the build to check (default: web/dist)

Used while the build moves from Python to React: the new build must give
search engines and readers the same pages. This compares what they see, not
the markup underneath:

  across the folders  the set of pages, robots.txt, the addresses in sitemap.xml
  for each page       title, every named meta tag, canonical, JSON-LD, ids,
                      links, the visible text, and the attributes that carry
                      words or meaning (labels, alt text, roles, link rel)

Prints every difference and exits 1 if there is any. How the pages look is
checked separately, by the screenshot test in web/.
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_TEXT = {"script", "style"}
# Tags that sit inside a line of text. Text on either side of one runs together
# unless the source has a space there; any other tag ends a word.
INLINE = {"a", "abbr", "b", "bdi", "bdo", "cite", "code", "data", "del", "dfn", "em", "i", "ins", "kbd", "mark",
          "q", "s", "samp", "small", "span", "strong", "sub", "sup", "time", "tspan", "u", "var", "wbr"}
# Attributes a reader meets without seeing them as text: names read aloud by a
# screen reader, roles, what a label or link points at, and the two data-
# attributes the stylesheet prints. Every aria- attribute is compared as well.
SPOKEN = ("alt", "title", "placeholder", "role", "scope", "lang", "for", "rel", "target", "data-unit", "data-l")
# Only these carry a ?v=<hash> cache marker. Any other address is compared whole.
HASHED = {("link", "href"), ("script", "src")}
# Per difference kind, how many examples to print before summarising the rest.
SHOWN = 5


class Page(HTMLParser):
    """What one HTML page offers a reader and a search engine."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.meta = {}
        self.canonical = []
        self.json_ld = []
        self.ids = []
        self.links = []
        self.text = []
        self.spoken = []
        self._skip = 0
        self._svg = 0
        self._in_title = False
        self._ld = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self._boundary(tag)
        if a.get("id"):
            self.ids.append(a["id"])
        for name in ("href", "src"):
            if a.get(name) is not None and not (tag == "link" and a.get("rel") in ("canonical", "icon")):
                url = versionless(a[name]) if (tag, name) in HASHED else a[name]
                self.links.append(f"{tag} {name} {url}")
        for name, value in attrs:
            if name in SPOKEN or name.startswith("aria-"):
                if not (tag == "link" and name == "rel"):  # stylesheet and icon links are in "links"
                    self.spoken.append(f"{tag} {name}={value if value is not None else ''}")
        if tag == "svg":
            self._svg += 1
        if tag == "title" and not self._svg:  # a <title> inside a map is that map's label, not the page's
            self._in_title = True
        if tag == "meta":
            key = a.get("name") or a.get("property") or a.get("http-equiv")
            if key:
                value = versionless(a.get("content", "")) if key == "og:image" else a.get("content", "")
                self.meta.setdefault(key, []).append(value)
        if tag == "link" and a.get("rel") == "canonical":
            self.canonical.append(a.get("href", ""))
        if tag == "script" and a.get("type") == "application/ld+json":
            self._ld = []
        if tag in SKIP_TEXT:
            self._skip += 1

    def handle_endtag(self, tag):
        self._boundary(tag)
        if tag == "title":
            self._in_title = False
        if tag == "svg" and self._svg:
            self._svg -= 1
        if tag == "script" and self._ld is not None:
            self.json_ld.append("".join(self._ld))
            self._ld = None
        if tag in SKIP_TEXT and self._skip:
            self._skip -= 1

    def _boundary(self, tag):
        if tag not in INLINE and not self._skip:
            self.text.append(" ")

    def handle_data(self, data):
        if self._ld is not None:
            self._ld.append(data)
        elif self._in_title:
            self.title += data
        elif not self._skip:
            self.text.append(data)

    def summary(self, path):
        ld = []
        for block in self.json_ld:
            try:
                ld.append(json.loads(block))
            except ValueError:
                ld.append(f"not valid JSON: {block[:60]}")
        return {
            "title": self.title.strip(),
            "meta": self.meta,
            "canonical": self.canonical,
            "json-ld": ld,
            "ids": sorted(self.ids),
            "repeated ids": sorted({i for i in self.ids if self.ids.count(i) > 1}),
            "links": self.links,
            "labels and roles": self.spoken,
            "text": " ".join("".join(self.text).split()),
        }


def versionless(url):
    """Drop a ?v=<hash> cache marker: the two builds hash their files differently."""
    return re.sub(r"\?v=[0-9a-f]+$", "", url)


def read_page(path):
    page = Page()
    page.feed(path.read_text(encoding="utf-8"))
    page.close()
    return page.summary(path)


def pages_in(folder):
    return {p.relative_to(folder).as_posix(): p for p in sorted(folder.rglob("*.html"))}


def sitemap_urls(folder):
    path = folder / "sitemap.xml"
    return sorted(re.findall(r"<loc>(.*?)</loc>", path.read_text(encoding="utf-8"))) if path.exists() else None


def first_difference(a, b):
    """Where two strings part ways, with a little of each side."""
    n = next((i for i, (x, y) in enumerate(zip(a, b)) if x != y), min(len(a), len(b)))
    lo = max(0, n - 30)
    return f"at character {n}: {a[lo:n + 40]!r} became {b[lo:n + 40]!r}"


def describe(kind, old, new):
    if kind in ("ids", "links", "labels and roles"):
        gone = [x for x in old if x not in new]
        added = [x for x in new if x not in old]
        if not gone and not added:
            return "same items in a different order"
        parts = []
        if gone:
            parts.append(f"{len(gone)} missing, first {gone[0]!r}")
        if added:
            parts.append(f"{len(added)} added, first {added[0]!r}")
        return "; ".join(parts)
    if kind == "text":
        return first_difference(old, new)
    if kind == "json-ld":
        return first_difference(json.dumps(old, sort_keys=True, ensure_ascii=False), json.dumps(new, sort_keys=True, ensure_ascii=False))
    return f"{old!r} became {new!r}"


def main():
    args = sys.argv[1:]
    old_dir = Path(args[0]) if args else ROOT / "_site"
    new_dir = Path(args[1]) if len(args) > 1 else ROOT / "web" / "dist"
    for folder in (old_dir, new_dir):
        if not folder.is_dir():
            raise SystemExit(f"{folder}: not a folder. Build it first.")

    found = {}  # kind -> list of messages

    def report(kind, message):
        found.setdefault(kind, []).append(message)

    old_pages, new_pages = pages_in(old_dir), pages_in(new_dir)
    for path in sorted(set(old_pages) - set(new_pages)):
        report("page missing from the new build", path)
    for path in sorted(set(new_pages) - set(old_pages)):
        report("page only in the new build", path)

    old_robots, new_robots = old_dir / "robots.txt", new_dir / "robots.txt"
    if (old_robots.read_bytes() if old_robots.exists() else None) != (new_robots.read_bytes() if new_robots.exists() else None):
        report("robots.txt", "the two files differ")
    old_map, new_map = sitemap_urls(old_dir), sitemap_urls(new_dir)
    if old_map != new_map:
        report("sitemap.xml", describe("links", old_map or [], new_map or []))

    shared = sorted(set(old_pages) & set(new_pages))
    for path in shared:
        old, new = read_page(old_pages[path]), read_page(new_pages[path])
        for kind in old:
            if old[kind] != new[kind]:
                report(kind, f"{path}: {describe(kind, old[kind], new[kind])}")

    if not found:
        print(f"parity: {len(shared)} pages match ({old_dir} and {new_dir})")
        return
    total = sum(len(v) for v in found.values())
    for kind, messages in found.items():
        print(f"{kind}: {len(messages)} difference{'s' if len(messages) != 1 else ''}")
        for message in messages[:SHOWN]:
            print(f"  {message}")
        if len(messages) > SHOWN:
            print(f"  and {len(messages) - SHOWN} more")
    raise SystemExit(f"parity: {total} difference{'s' if total != 1 else ''} across {len(shared)} shared pages")


if __name__ == "__main__":
    main()
