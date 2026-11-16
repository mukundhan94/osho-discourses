# Listen, watch and read links

This site hosts no recordings. Each series can link out to places where it can be heard, watched or read.

## Two files

| File | Who writes it | What it holds |
|---|---|---|
| `data/media.csv` | `make media` | Each series' Sannyas Wiki page, its talk and recording counts, and an OshoWorld listen link where one matches |
| `data/links.csv` | People | Any other link, added by hand |

Do not edit `data/media.csv`. The next `make media` run would overwrite the change.

## Add a link by hand

Add one row to `data/links.csv`:

```csv
title,kind,label,url
Beyond Psychology,watch,Watch on Internet Archive,https://archive.org/details/example
```

| Column | Meaning |
|---|---|
| `title` | The series title, as it appears in `data/talks/`. Volume and chapter numbers can be left off to cover every row of that series. |
| `kind` | `listen`, `watch` or `read`. It sets the button's colour and icon. |
| `label` | The button text. Say where the link goes: "Watch on Internet Archive". |
| `url` | The address. It must start with `https://`. |

Then run `make serve` and look at the series on the page.

## Which links are accepted

- Free to open. No shops, paid memberships or downloads that need payment.
- A page about that series, not a site's home page.
- Nothing hosted in this repo. Link out; do not add audio or video files.

## How the generated links are found

`scripts/media_links.py` does three things for each series title on the wiki year pages:

1. Finds the wiki's series page, following redirects. If there is none, it uses the first talk's page.
2. Reads that page's table of contents: how many talks, how long, and whether the wiki says video or audio exists.
3. Looks for a matching series page in OshoWorld's public sitemap, by title, and fetches it once to confirm it exists.

A "Search YouTube" button appears only where the wiki says video exists. It is a search, not a specific video.

Series that OshoWorld spells differently get no listen link. Add one by hand in `data/links.csv`.
