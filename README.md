# Osho: the talks

A year-by-year chronology of Osho's talks, 1954 to 1990: the series, the dates, the place and the number of talks.

**Site:** https://mukundhan94.github.io/osho-discourses/

The site is one static page with 28 year sections. Each has a table of talks, a small map of that year's places and a photograph.

## How far to trust the data

Every row is compiled from the [Sannyas Wiki year timelines](https://www.sannyas.wiki/index.php?title=Osho_Timeline). The wiki is the authority: where this repo and the wiki differ, the wiki is right.

| What | Status |
|---|---|
| Talk counts for titled series | Checked against the raw wiki text with `scripts/wiki_check.py`. They are counts of rows on the wiki, not verified totals. |
| Dates and places | Not checked row by row. |
| Untitled talks grouped by town ("Talks in Gwalior") | Not checked, because they have no wiki title to match on. Most are in 1954 to 1970. |
| Whether a tape survives | Not checked for any row. |
| Town coordinates in `data/places.csv` | Approximate. They only place dots on a small map. |

"At least" and "about" in a count are the wiki's own words.

Many early titles are later book compilations of talks given in different towns. That is why one series can span months and cities.

## Run it

Build the site into `_site/`. This needs Python 3 and nothing else:

```bash
python3 scripts/build.py
```

Serve it locally:

```bash
python3 -m http.server 8431 --directory _site
```

Compare the data with the wiki:

```bash
python3 scripts/wiki_check.py
```

The check downloads each raw year page into a cache directory, prints the differences and exits non-zero if there are any.

Some differences are expected and stay listed:

- Untitled talks grouped by town have no matching wiki title.
- The wiki types some newspaper reports (Samachar Vibhag) as discourses.
- Three counts differ by one, for reasons given in the note on that row.

`_site/` is not committed.

GitHub Actions builds it on every pull request. On every push to `main` it also deploys to GitHub Pages (`.github/workflows/pages.yml`).

## What is where

```
data/talks/<year>.csv    one file per year section, one row per series or group of talks
data/years.json          heading, summary and photograph for each section, in page order
data/places.csv          town, latitude, longitude
data/india-outline.json  simplified India outline for the maps
data/world-outline.json  simplified world land outline for years abroad
assets/site.css          the stylesheet
assets/site.js           year band tracking, about 50 lines
assets/fonts/            Yatra One and Hind, self-hosted
assets/img/              one photograph per year, and CREDITS.md
scripts/build.py         builds the site (standard library only)
scripts/wiki_check.py    compares the data with the raw wiki year pages
PRODUCT.md               who the page is for and what it must do
```

## Data format

`data/talks/<year>.csv` columns:

| Column | Meaning |
|---|---|
| `sort` | Sort key, ISO-like (`1964-06-03`). Add a letter to order rows that share a date. |
| `dates` | Dates as shown on the page. |
| `title` | Series title as romanised on the wiki, or a description for untitled talks. |
| `place` | Place as shown on the page. |
| `towns` | Towns for the map, separated by `;`. Each must exist in `data/places.csv`. |
| `talks` | A number, `at least N`, `about N` or `unknown`. |
| `kind` | `series`, `camp` (meditation camp), `untitled`, `darshan` (darshan diary) or `interview` (press interviews). |
| `unsure` | `y` when the source marks the date, place or count as uncertain. |
| `note` | Optional short note shown under the title. |
| `lang` | `hi`, `en`, or empty when mixed or not stated. |

A series that runs across New Year is either split by year, or sits in the year it starts with its full dates in `dates`.

The build fails on any of these:

- a wrong header, or an unknown `kind` or `lang`
- a town missing from `data/places.csv`
- a photograph that is missing from `assets/img/` or not listed in `assets/img/CREDITS.md`

A year whose towns all lie in central and northern India gets an India map. Any other year gets a world map fitted to its places.

## Change the data

To correct a row, edit its CSV, then run the build and the wiki check.

To add a year section:

1. Add `data/talks/<year>.csv` with the header above.
2. Add any new towns to `data/places.csv`.
3. Add an entry to `data/years.json` with `id`, `heading` and `lede`.
4. Optionally add a `photo`. The file goes in `assets/img/`, and its credit goes in `assets/img/CREDITS.md`.
5. Run the build and the wiki check, then look at the page.

The link to the year's wiki page is derived from the `id`.

## Sources

- [Sannyas Wiki, Osho Timeline](https://www.sannyas.wiki/index.php?title=Osho_Timeline) and its year pages
- [Osho Source Book, Part Two](https://oshosourcebook.com/part-two/)
- [Neeten, "Osho's First Book From His First Camp"](https://www.pierreevald.dk/wp-content/uploads/RanakpurCamp.pdf)

## Credits and licences

- **Photographs:** Wikimedia Commons contributors. Each file's author, licence and source are in [assets/img/CREDITS.md](assets/img/CREDITS.md).
  - All but one are under Creative Commons licences.
  - The 1983 photograph of Rajneeshpuram is released by its photographer for any use with attribution.
- **Map outlines:** [Natural Earth](https://www.naturalearthdata.com/), public domain.
- **Fonts:** [Yatra One](https://fonts.google.com/specimen/Yatra+One) and [Hind](https://fonts.google.com/specimen/Hind), SIL Open Font License 1.1.
- **Code and compiled data:** no licence has been chosen yet.
