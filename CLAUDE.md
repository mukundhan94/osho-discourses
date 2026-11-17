# Osho: the discourses

A static site listing Osho's talks by year, 1954 to 1990, with links out to recordings. Live at https://oshodiscourses.com/.

This is a non-commercial reference library: it collects what was spoken, when and where, and links to recordings hosted by others. Nothing here is for sale, and the site carries no advertising.

## Commands

| Command | What it does |
|---|---|
| `make serve` | Build and serve at http://localhost:8431 |
| `make build` | Build into `_site/` |
| `make check` | Compare `data/talks/` with the raw wiki year pages |
| `make media` | Regenerate `data/media.csv` (slow: it fetches about 900 pages) |
| `make slugs` | Give new series an address in `data/slugs.csv` |
| `make bodycheck BASELINE=<file>` | Build, then compare the home page `<body>` with a saved copy of `index.html` |
| `make clean` | Remove `_site/` |

Python 3 standard library only. Do not add dependencies or a build step.

There is no test suite and no linter. `make build` is the test: it validates the data and the built pages and stops on the first fault. [docs/checks.md](docs/checks.md) lists every fault it catches.

## How the build works

`scripts/build.py` is the whole site generator: one file, run top to bottom by `main()`.

1. **Load and validate.** `data/years.json` gives the 28 year sections in order. Each has a CSV in `data/talks/` with one row per series or talk. `data/places.csv` gives map coordinates, `data/media.csv` the per-series wiki page and recording counts, `data/links.csv` hand-added links.
2. **Match rows to series.** `media_for()` matches a row's title to a key in `media.csv`. That one match decides a row's Listen, Video and Wiki links and which series page it belongs to. A row with no match is an untitled talk and has no series page.
3. **Render three kinds of page** from the same pieces:
   - the home page (`page()`), all 28 year sections on one page;
   - a year page per year (`year_page()`), at `/year/<id>/`;
   - a series page per titled series (`series_page()`), at `/series/<slug>/`.
4. **Check and write.** `check_pages()` requires a unique title, description and canonical on every page, and every internal link to lead to a file. Then `robots.txt` and `sitemap.xml` are written.

Things that span several functions:

- **One section, two pages.** `year_html()` makes a year's section for both the home page and the year page, so they cannot drift. `row_html()` makes a row for all three page kinds.
- **Shared page furniture.** `head_html()`, `year_band()`, `sprite_html()` and `footer_html()` are used by every page. Pages in folders pass `root="/"` so their asset addresses are absolute.
- **Addresses are data.** A year's address is its `id` in `years.json`. A series address is its `slug` in `data/slugs.csv`. The build never invents a slug: a series with no row stops the build, and `make slugs` adds it.
- **Styles and script.** `assets/site.css` styles every page. `assets/pages.css` is loaded only by year and series pages. `assets/site.js` (year band tracking, series search, reading tour) is loaded only by the home page. Stylesheet and script links carry a content hash, so editing either changes the page's HTML.
- **Sitemap dates** come from the last git commit touching `PAGE_SOURCES` (`data`, `assets`, `scripts/build.py`).

`scripts/wiki_check.py` and `scripts/media_links.py` are data tools, not part of the build. `scripts/og.html` is the source of the social preview images in `assets/og/`.

## Publishing

Vercel builds and deploys every push to `main` (`vercel.json`). The GitHub workflow only checks that the build passes. So a merge to `main` is a deploy.

`.claude/settings.json` allows the build and check commands without a prompt, and asks before any `vercel` command, `git push`, and creating, editing or merging a pull request. `.claude/launch.json` starts the preview with `make serve`.

Work on a branch and open a pull request. `vercel.json` also holds the redirects that keep each page at one address; a new kind of page in its own folder needs its own rule there.

## Where to look

| For | Read |
|---|---|
| Data files and columns | [docs/data.md](docs/data.md) |
| How links work, and adding one | [docs/links.md](docs/links.md) |
| What the build and the wiki check verify | [docs/checks.md](docs/checks.md) |
| Hosting, the domain, page addresses, structured data | [docs/publishing.md](docs/publishing.md) |
| Colours, type, components | [DESIGN.md](DESIGN.md) |
| Who the site is for | [PRODUCT.md](PRODUCT.md) |
| What contributions are accepted | [CONTRIBUTING.md](CONTRIBUTING.md) |

## Rules

- **The Sannyas Wiki is the authority.** Read its raw text (`&action=raw`), not a summary of the page. Summarising tools have got series boundaries wrong here.
- **Keep the source's uncertainty.** If the wiki marks a date, place or count as uncertain, set `unsure` to `y` and say what is uncertain in `note`.
- **Do not edit `data/media.csv` by hand.** Hand-added links go in `data/links.csv`.
- **No recordings in the repo.** The site links out.
- **No commercial links:** no shops, paid memberships or advertising.
- **Photographs:** freely licensed only, credited in `assets/img/CREDITS.md`. None of Osho, and none whose subject is an identifiable private person.
- **No em-dashes** in any text. The build rejects them in the data files.
- **Addresses are permanent.** Never change a `slug` in `data/slugs.csv` or a year's `id`; see [docs/publishing.md](docs/publishing.md).
- **`_site/` is build output.** Never commit it.

## After a change

1. `make build` must pass.
2. Run `make check` after touching a title or a talk count. Three count differences are expected; see [docs/checks.md](docs/checks.md).
3. For anything visible, look at the page at desktop and phone width.
4. To prove a change left the home page alone, save `_site/index.html` first and run `make bodycheck BASELINE=<that copy>` afterwards.
