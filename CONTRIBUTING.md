# Contributing

Thank you for helping. Corrections and links are both welcome.

This is a non-commercial reference library: it collects what was spoken, when and where, and links to recordings hosted by others. Nothing here is for sale, and the site carries no advertising.

## The quick way

You do not need to run anything.

- **Found a mistake?** [Report it](https://github.com/mukundhan94/osho-discourses/issues/new?template=mistake.yml).
- **Know where a series can be heard or watched?** [Suggest a link](https://github.com/mukundhan94/osho-discourses/issues/new?template=link.yml).

## Changing the files yourself

You need Python 3 and `make`.

| To do this | Edit this | Guide |
|---|---|---|
| Fix a date, place, title or count | The year's file in `data/talks/` | [docs/data.md](docs/data.md) |
| Add a listen, watch or read link | `data/links.csv` | [docs/links.md](docs/links.md) |
| Add a year | A new file in `data/talks/`, and `data/years.json` | [docs/data.md](docs/data.md) |
| Add or replace a photograph | `assets/img/`, `data/years.json`, `assets/img/CREDITS.md` | Below |

Then:

1. Run `make serve` and look at your change at http://localhost:8431.
2. Run `make check` if you changed a title or a talk count.
3. Open a pull request. Say where the new information comes from.

## What is accepted

- **Facts need a source.** Link the Sannyas Wiki page or another source in the pull request.
- **Links must be free to open.** No shops, paid memberships or advertising.
- **No recordings in the repo.** Link to them; do not add audio or video files.
- **Photographs must be freely licensed**, for example from Wikimedia Commons. Credit each one in `assets/img/CREDITS.md`.
- **No photographs of Osho, and none whose subject is an identifiable private person.**

## Licences

By contributing you agree that your change is released under the repo's licences: MIT for code, CC BY-NC-ND 4.0 for the data. See [LICENSE](LICENSE) and [LICENSE-DATA](LICENSE-DATA).
