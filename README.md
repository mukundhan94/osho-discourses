# Osho: the talks

A chronology of Osho's talks in date order: the series, the dates, the place and the number of talks, year by year.

**Site:** https://mukundhan94.github.io/osho-discourses/

Coverage: see the site. Each year has one file in `data/talks/`.

## What the data is, and is not

- Every row is compiled from the [Sannyas Wiki year timelines](https://www.sannyas.wiki/index.php?title=Osho_Timeline). The wiki is the authority. Where this repo and the wiki differ, the wiki is right.
- Talk counts are rows on the wiki, not verified totals. "At least" and "about" are the source's own words.
- Many titles are later book compilations of talks given in different towns, so one series can span months and cities.
- Whether a tape survives was not checked for any row.
- How it was compiled: the wiki pages were first read through a summarising tool, then every data file was compared with the raw wiki text using `scripts/wiki_check.py`. That check covers the number of rows per titled series. It does not cover dates, places, or untitled talks that are grouped here by town.
- Town coordinates in `data/places.csv` are approximate and only place dots on a small map.

## Layout

```
data/talks/<year>.csv   one file per year section, one row per series or group of talks
data/years.json         heading, summary and photograph for each section, in page order
data/places.csv         town, latitude, longitude
data/india-outline.json simplified India outline for the maps
data/world-outline.json simplified world land outline for years abroad
assets/                 stylesheet, script, fonts and photographs
scripts/build.py        builds the site into _site/ (Python 3, standard library only)
scripts/wiki_check.py   compares the data files with the raw wiki year pages
PRODUCT.md              who the page is for and what it must do
```

## Build

```bash
python3 scripts/build.py
```

```bash
python3 -m http.server 8431 --directory _site
```

Check the data against the wiki (downloads the raw year pages into a cache directory, prints differences, exits non-zero if there are any):

```bash
python3 scripts/wiki_check.py
```

Some differences are expected: untitled talks grouped by town have no matching wiki title, and the wiki types some newspaper reports (Samachar Vibhag) as discourses.

`_site/` is not committed. GitHub Actions builds it and deploys it to GitHub Pages on every push to `main` (`.github/workflows/pages.yml`).

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

The build fails on a wrong header, an unknown `kind` or `lang`, or a town missing from `data/places.csv`.

A year whose towns all lie in central and northern India gets an India map. Any other year gets a world map fitted to its places.

## Adding a year

1. Add `data/talks/<year>.csv` with the header above.
2. Add any new towns to `data/places.csv`.
3. Add an entry to `data/years.json` with `id`, `heading` and `lede`. A `photo` is optional: the file goes in `assets/img/` with its credit in `assets/img/CREDITS.md`.
4. Run the build and check the page. The link to the year's wiki page is derived from the `id`.

## Sources

- [Sannyas Wiki, Osho Timeline](https://www.sannyas.wiki/index.php?title=Osho_Timeline) and its year pages
- [Osho Source Book, Part Two](https://oshosourcebook.com/part-two/)
- [Neeten, "Osho's First Book From His First Camp"](https://www.pierreevald.dk/wp-content/uploads/RanakpurCamp.pdf)

## Credits and licences

- Photographs: Wikimedia Commons contributors, each under a Creative Commons licence. See [assets/img/CREDITS.md](assets/img/CREDITS.md).
- Map outline: [Natural Earth](https://www.naturalearthdata.com/), public domain.
- Fonts: [Yatra One](https://fonts.google.com/specimen/Yatra+One) and [Hind](https://fonts.google.com/specimen/Hind), SIL Open Font License 1.1.
- No licence has been chosen yet for the code and the compiled data in this repo.
