# Osho: the talks

Every talk Osho gave from 1954 to 1990, year by year: the series, the dates, the place and how many talks.

**Read it here:** https://mukundhan94.github.io/osho-discourses/

Each year has a table of talks, a map of that year's places and a photograph.

Where recordings exist elsewhere, a series links out to them. This site hosts no audio or video.

## Good to know

- The data comes from the [Sannyas Wiki](https://www.sannyas.wiki/index.php?title=Osho_Timeline). Where the two differ, the wiki is right.
- Talk counts for titled series were checked against the wiki. Dates, places and untitled talks were not.
- Found a mistake? Open an issue, or fix the year's file in `data/talks/` and send a pull request.

## Run it yourself

You need Python 3 and `make`. Nothing else.

| Command | What it does |
|---|---|
| `make serve` | Builds the site and serves it at http://localhost:8431 |
| `make build` | Builds the site into `_site/` |
| `make check` | Compares the data with the wiki and lists differences |
| `make media` | Refreshes the listen and watch links in `data/media.csv` |

Pushing to `main` publishes the site through GitHub Actions.

## Change the data

Each year is one CSV file in `data/talks/`, one row per series. Edit a row, run `make serve`, and look at the page.

The column guide, and how to add a year or a photograph, are in [data/README.md](data/README.md).

## Where things are

| Path | What it holds |
|---|---|
| `data/` | The talks, places, year summaries and outside links |
| `assets/` | Stylesheet, script, fonts and photographs |
| `scripts/` | The site builder, the wiki check and the link finder |
| `DESIGN.md` | Colours, type and components, for anyone restyling the page |
| `PRODUCT.md` | Who the page is for |

## Credits and licences

- **Talks data:** compiled from the Sannyas Wiki, CC BY-NC-ND 4.0. See [LICENSE-DATA](LICENSE-DATA).
- **Code:** MIT. See [LICENSE](LICENSE).
- **Photographs:** Wikimedia Commons contributors. Each one is credited in [assets/img/CREDITS.md](assets/img/CREDITS.md).
- **Maps:** [Natural Earth](https://www.naturalearthdata.com/), public domain.
- **Fonts:** Yatra One and Hind, SIL Open Font License.
- **Recordings:** not hosted here.
  - Links go to [OshoWorld](https://oshoworld.com/audio), the Sannyas Wiki and YouTube.
  - OSHO International publishes the official recordings at [osho.com](https://www.osho.com/).
