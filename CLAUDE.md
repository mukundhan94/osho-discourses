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

Python 3 standard library only. Do not add dependencies or a build step.

## Where to look

| For | Read |
|---|---|
| Data files and columns | [docs/data.md](docs/data.md) |
| How links work, and adding one | [docs/links.md](docs/links.md) |
| What the build and the wiki check verify | [docs/checks.md](docs/checks.md) |
| Hosting and the domain | [docs/publishing.md](docs/publishing.md) |
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
- **`_site/` is build output.** Never commit it.

## After a change

1. `make build` must pass.
2. Run `make check` after touching a title or a talk count. Three count differences are expected; see [docs/checks.md](docs/checks.md).
3. For anything visible, look at the page at desktop and phone width.
