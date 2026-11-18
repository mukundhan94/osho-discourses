# What the checks cover

## `make check`

It downloads each raw wiki year page and counts the rows per series title.

| What | Status |
|---|---|
| Talk counts for titled series | Checked. They are counts of rows on the wiki, not verified totals. |
| Dates and places | Not checked row by row. |
| Untitled talks grouped by town ("Talks in Gwalior") | Not checked, because they have no wiki title to match on. Most are in 1954 to 1970. |
| Whether a tape survives | Not checked here. `media.csv` records what the wiki says exists. |

Some differences are expected and stay listed:

- Untitled talks grouped by town have no matching wiki title.
- The wiki types some newspaper reports (Samachar Vibhag) as discourses.
- Three counts differ by one, for reasons given in the note on that row.

## `make bodycheck`

Compares the home page's `<body>` with a saved baseline, byte for byte. See [publishing.md](publishing.md). It covers the home page only, and only the body: changes inside `<head>` pass.

## `make parity` and `make shots`

These two exist while the build moves from Python to React. They compare the Python build in `_site/` with the new build in `web/dist/`, which must give readers and search engines the same site.

`make parity` runs `scripts/parity_check.py` (Python, no dependencies). It compares:

- the set of pages, `robots.txt`, and the addresses in `sitemap.xml`;
- on every page: the title, every named meta tag (description, robots, social tags and the rest), canonical, JSON-LD, ids, links in page order, visible text, and the attributes that carry words or meaning (every `aria-` attribute, alt text, roles, a label's `for`, a link's `rel` and `target`).

It ignores what a reader cannot perceive: markup structure, class names, runs of whitespace, and the cache marker on stylesheet and script links.

It does not check behaviour. Whether the search, the reading tour and the year band still work is checked when those parts are ported.

`make shots` runs a Playwright test in `web/`. It photographs the Python build, then photographs the new build and compares each picture pixel by pixel, at 1440px and 390px wide:

| Target | Pictures per width |
|---|---|
| Home page: masthead, year band, reading tour, footer | 4 |
| Home page: each year section | 28 |
| Year pages, whole page | 28 |
| Series pages, whole page (20 chosen to cover every kind) | 20 |

No pixel may differ. Fifteen runs of the Python build against itself differed by zero pixels (2026-11-17).

Both commands need Node 24 (`nvm use` reads `.nvmrc`), and `web/dist/` built by `make web`. Until pages are ported, `web/dist/` holds no pages, so `make parity` reports every page as missing.

Before the first `make shots`, run `npm --prefix web install` and `npx --prefix web playwright install chromium` once. To compare a folder other than `web/dist/`, run `python3 scripts/parity_check.py OLD NEW`, or set `PARITY_DIR` for `npm --prefix web run shots:compare`.

## `npm --prefix web test`

Runs while both builds exist. `web/src/data/` loads `data/` for the new build, and must agree with `scripts/build.py`:

- on the real data, both load the same values: every year, row, town list, row id, matched series, and every series with its name, kind, years and address;
- on each broken copy of the data in `web/tests/fixtures/data-cases.json`, both stop with the same message.

The Python side is `scripts/data_dump.py`. The broken copies cover the faults below that come from the data files. The page checks (titles, links, the shared picture, structured data) move over with the pages.

## `make build`

`make build` fails on any of these:

- a wrong header, or an unknown `kind` or `lang`
- a town missing from `data/places.csv`
- a photograph that is missing from `assets/img/` or not listed in `assets/img/CREDITS.md`
- a shared picture (`OG_IMAGE` in `scripts/build.py`) that is not a PNG, is cut short or damaged, is not 1200 by 630 pixels, or is over 300 KB
- an `id` used twice in `data/years.json`, or years that are not in date order
- a series with no row in `data/slugs.csv`, a row there whose series is gone, or a slug that is repeated or not lower-case letters and digits joined by hyphens
- two pages with the same title, description or canonical address, or a page missing one of them
- a link or picture address inside the site that leads to no file in `_site/`
- structured data that does not parse back to what was written, or a first or last entry in `data/years.json` whose `numeral` is not a four-digit year, or a first year later than the last
- a row in `data/links.csv` with a missing title or label, an unknown `kind`, an address that does not start with `https://`, or a title that matches no series
