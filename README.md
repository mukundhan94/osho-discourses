# Osho: the talks

A chronology of Osho's talks in date order: the series, the dates, the place and the number of talks, year by year.

**Site:** https://mukundhan94.github.io/osho-discourses/

Coverage so far: 1954 to 1967. Later years (Bombay, Poona, Rajneeshpuram, the world tour, Poona again, up to the last discourse on 10 April 1989) are still to be added.

## What the data is, and is not

- Every row is compiled from the [Sannyas Wiki year timelines](https://www.sannyas.wiki/index.php?title=Osho_Timeline). The wiki is the authority. Where this repo and the wiki differ, the wiki is right.
- Talk counts are rows on the wiki, not verified totals. "At least" and "about" are the source's own words.
- Many titles are later book compilations of talks given in different towns, so one series can span months and cities.
- Whether a tape survives was not checked for any row.
- Town coordinates in `data/places.csv` are approximate and only place dots on a small map.

## Layout

```
data/talks/<year>.csv   one file per year section, one row per series or group of talks
data/years.json         heading, summary and photograph for each section, in page order
data/places.csv         town, latitude, longitude
data/india-outline.json simplified outline used by the maps
assets/                 stylesheet, script, fonts and photographs
scripts/build.py        builds the site into _site/ (Python 3, standard library only)
PRODUCT.md              who the page is for and what it must do
```

## Build

```bash
python3 scripts/build.py
```

```bash
python3 -m http.server 8431 --directory _site
```

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
| `kind` | `series`, `camp` or `untitled`. |
| `unsure` | `y` when the source marks the date, place or count as uncertain. |
| `note` | Optional short note shown under the title. |

The build fails on an unknown `kind`, an unknown town, or a town outside the map window.

## Adding a year

1. Add `data/talks/<year>.csv` with the header above.
2. Add any new towns to `data/places.csv`.
3. Add an entry to `data/years.json`. A photograph goes in `assets/img/` with its credit in `assets/img/CREDITS.md`.
4. Add the wiki page to `SOURCES` in `scripts/build.py`.
5. Run the build and check the page.

## Sources

- [Sannyas Wiki, Osho Timeline](https://www.sannyas.wiki/index.php?title=Osho_Timeline) and its year pages
- [Osho Source Book, Part Two](https://oshosourcebook.com/part-two/)
- [Neeten, "Osho's First Book From His First Camp"](https://www.pierreevald.dk/wp-content/uploads/RanakpurCamp.pdf)

## Credits and licences

- Photographs: Wikimedia Commons contributors, each under a Creative Commons licence. See [assets/img/CREDITS.md](assets/img/CREDITS.md).
- Map outline: [Natural Earth](https://www.naturalearthdata.com/), public domain.
- Fonts: [Teko](https://fonts.google.com/specimen/Teko) and [Mukta](https://fonts.google.com/specimen/Mukta), SIL Open Font License 1.1.
- No licence has been chosen yet for the code and the compiled data in this repo.
