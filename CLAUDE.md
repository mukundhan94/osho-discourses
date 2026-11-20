# Osho: the discourses

A static site listing Osho's talks by year, 1954 to 1990, with links out to recordings. Live at https://oshodiscourses.com/.

This is a non-commercial reference library: it collects what was spoken, when and where, and links to recordings hosted by others. Nothing here is for sale, and the site carries no advertising.

## Commands

| Command | What it does |
|---|---|
| `make serve` | Build and serve at http://localhost:8431 |
| `make build` | Type-check, build into `web/dist/`, then check the finished site |
| `make test` | Run the unit tests |
| `make check` | Compare `data/talks/` with the raw wiki year pages |
| `make media` | Regenerate `data/media.csv` (slow: it fetches about 900 pages) |
| `make slugs` | Give new series an address in `data/slugs.csv` |
| `make clean` | Remove `web/dist/` |

Node is pinned to 24 in `.nvmrc`. Run `nvm use` before `make build`, `make serve`, `make test` or `make slugs`: an older Node stops Astro. `make check` and `make media` are Python 3, standard library only, and need no Node.

To run one test file: `cd web && node --test src/lib/format.test.ts`. `npm --prefix web run check` type-checks without building.

There is no linter. `make build` is the main check: it stops on the first fault in the data or in the finished pages. [docs/checks.md](docs/checks.md) lists every fault it catches.

## How the build works

The site is built by Astro 7 with React 19, in TypeScript (strict), from the folder `web/`. Packages in `web/package.json` are pinned to exact versions.

1. **Load and check.** `loadSite()` in `web/src/data/index.ts` reads `data/years.json` (the 28 year sections, in order), one CSV per year in `data/talks/`, `data/places.csv` (map coordinates), `data/media.csv` (each series' wiki page and recording counts) and `data/links.csv` (hand-added links). It checks them in a fixed order and stops with a `DataError` on the first fault.
2. **Match rows to series.** `mediaFor()` in `web/src/data/match.ts` matches a row's title to a key in `media.csv`. That one match decides a row's Listen, Video and Wiki links and which series page it belongs to. A row with no match is an untitled talk and has no series page.
3. **Write three kinds of page**, from `web/src/pages/`:
   - `index.astro`, the home page, with all 28 year sections;
   - `year/[id].astro`, one page per year, at `/year/<id>/`;
   - `series/[slug].astro`, one page per titled series, at `/series/<slug>/`.

   `robots.txt.ts` and `sitemap.xml.ts` beside them write those two files.
4. **Finish and check.** A hook in `web/astro.config.ts` copies `assets/` into `web/dist/assets/`, then runs `web/src/lib/checks.ts`: every page has its own title, description and canonical address, every link inside the site leads to a file, and the shared picture is a sound PNG of the declared size.

Where the code lives:

| Folder | What it holds |
|---|---|
| `web/src/data/` | Reading and checking the data files |
| `web/src/lib/` | Logic with no markup: map projection and label placement, row summaries, number formatting, the sitemap, the finished-site checks |
| `web/src/components/` | React components, rendered to HTML at build time and sent with no script |
| `web/src/components/islands/` | The three components that also run in the browser |
| `web/src/layouts/`, `web/src/pages/` | Astro: the document and head, and each page's outline |

Things that span several files:

- **One section, two pages.** `YearSection` makes a year's section for both the home page and the year page, so they cannot drift. `Row` makes a row for all three page kinds.
- **Addresses are data.** A year's address is its `id` in `years.json`. A series address is its `slug` in `data/slugs.csv`. The build never invents a slug: a series with no row stops the build, and `make slugs` adds it.
- **Styles are not part of the build.** `assets/site.css` styles every page and `assets/pages.css` is loaded only by year and series pages. The components write the class names those files expect. Stylesheet links carry a `?v=` hash of the file.
- **Three parts run in the browser:** `YearBand` on every page, and `Find` (the series search) and `Tour` on the home page. A part runs in the browser only where a page file gives it `client:load`. Whatever it is given there is written into the page as data, so give it little. Code those three import must not read files: `data/match.ts`, `data/norm.ts` and `data/errors.ts` are safe, `data/index.ts` is not.
- **Sitemap dates** come from the last git commit touching `data`, `assets` or `web/src` (`PAGE_SOURCES` in `web/src/lib/sitemap.ts`).

`scripts/wiki_check.py` and `scripts/media_links.py` are data tools in Python, not part of the build. `norm()` in `wiki_check.py` and `web/src/data/norm.ts` must agree: the Python one writes the keys in `media.csv`, the TypeScript one matches titles to them. `scripts/og.html` is the source of the social preview images in `assets/og/`.

### Three rules that are easy to break

- **One string per run of text.** In JSX, write `` {`All in ${town}`} ``, never `All in {town}`. React puts an empty comment between a value and the text beside it. The browser then shapes the two pieces apart, kerning across the join is lost, and text moves by a fraction of a pixel.
- **Format numbers with `lib/format.ts`.** The site was first built by a Python script, and every published coordinate keeps the digits it printed. Python rounds an exact half to the even digit; `toFixed()` and `Math.round()` do not.
- **Keep the fault messages stable.** `web/tests/fixtures/data-cases.json` pins the exact message for each broken data file. A reworded message needs its case updated in the same change.

## Publishing

Vercel builds and deploys every push to `main` (`vercel.json`): it runs `npm --prefix web ci`, then `npm --prefix web run build`, and serves `web/dist/`. So a merge to `main` is a deploy. The GitHub workflow only checks that the tests and the build pass.

Vercel's Node version (24.x) is a setting in the Vercel project, not a file here. Do not rely on `.nvmrc` or `engines` for it.

`.claude/settings.json` allows the build, test and check commands without a prompt, and asks before any `vercel` or `npx vercel` command, `git push`, and creating, editing or merging a pull request. `.claude/launch.json` starts the preview with `make serve`.

Work on a branch and open a pull request. `vercel.json` also holds the redirects that keep each page at one address; a new kind of page in its own folder needs its own rule there. It marks everything under `/_astro/` as cacheable for a year, which is safe only because those file names carry a hash of their content.

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
- **`web/dist/` is build output.** Never commit it.

## After a change

1. `make build` and `make test` must pass.
2. Run `make check` after touching a title or a talk count. Three count differences are expected; see [docs/checks.md](docs/checks.md).
3. For anything visible, look at the page at desktop and phone width with `make serve`. Nothing compares pictures automatically, so a visual change is caught only by looking.
4. For anything in `web/src/components/islands/`, try it in a browser: the search, the tour, and the year band following the page. No test drives them.
