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

## `make build`

`make build` fails on any of these:

- a wrong header, or an unknown `kind` or `lang`
- a town missing from `data/places.csv`
- a photograph that is missing from `assets/img/` or not listed in `assets/img/CREDITS.md`
- a shared picture (`OG_IMAGE` in `scripts/build.py`) that is not a PNG, is cut short or damaged, is not 1200 by 630 pixels, or is over 300 KB
- a row in `data/links.csv` with a missing title or label, an unknown `kind`, an address that does not start with `https://`, or a title that matches no series
