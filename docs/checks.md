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

## `make build`

`make build` type-checks the code, builds the site, then checks what it built. It stops on the first fault and says which file and line.

In the data files:

- a wrong header, a row with the wrong number of fields, or an unknown `kind` or `lang`
- an `unsure` value that is not empty or `y`
- an em-dash in a row
- a town missing from `data/places.csv`
- a year with no rows, or with no `heading` or `lede`
- a photograph that is missing from `assets/img/` or not listed in `assets/img/CREDITS.md`
- an `id` used twice in `data/years.json`, or years that are not in date order
- a first or last entry in `data/years.json` whose `numeral` is not a four-digit year, or a first year later than the last
- a `talks`, `video` or `minutes` value in `data/media.csv` that is not a whole number
- a series with no row in `data/slugs.csv`, a row there whose series is gone, or a slug that is repeated or not lower-case letters and digits joined by hyphens
- a row in `data/links.csv` with a missing title or label, an unknown `kind`, an address that does not start with `https://`, or a title that matches no series

In the finished site:

- two pages with the same title, description or canonical address, or a page missing one of them
- a link or picture address inside the site that leads to no file
- a shared picture (`OG_IMAGE` in `web/src/lib/site.ts`) that is not a PNG, is cut short or damaged, is not 1200 by 630 pixels, or is over 300 KB

## `make test`

Runs the unit tests in `web/src/`, with Node's own test runner.

| Tests | What they cover |
|---|---|
| `data/data.test.ts` | The real data loads, with the totals the site states. Each broken copy of the data in `web/tests/fixtures/data-cases.json` stops the loader with exactly the message written there. Each odd but valid copy still loads |
| `lib/checks.test.ts` | The finished-site checks, on small broken folders and damaged pictures; the sitemap text; the sitemap date with full history, in a shallow clone and with no git |
| `lib/format.test.ts` | Numbers formatted as Python formats them, including exact halves |
| `lib/series.test.ts`, `lib/site.test.ts` | A series' start date, the description clipping, the check on the first and last years |

## What nothing checks

- **How the pages look.** No test compares pictures. Look at the page with `make serve`, at desktop and phone width.
- **The parts that run in the browser.** No test drives the series search, the reading tour or the year band. Try them by hand after changing anything in `web/src/components/islands/`.
- **Structured data beyond being valid JSON.** Google's Rich Results Test, run on the live address, is the check for that.

The site was moved from a Python build to this one in November 2026. During the move every page was compared element by element with the old build, and pictures and behaviour were compared too. Those comparison tools were removed with the old build.
