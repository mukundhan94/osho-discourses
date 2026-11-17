# Publishing

The site is a folder of static files. `make build` writes it to `_site/`, which is not committed.

## Where it is served

| Address | Host | How it updates |
|---|---|---|
| https://oshodiscourses.com/ | Vercel (Hobby plan) | Every push to `main` |

`www.oshodiscourses.com` redirects to the address above (a permanent redirect set on the domain in Vercel). GitHub Pages is turned off.

The stylesheet and script links carry a short content hash (`site.css?v=...`), so a change is never hidden by a cached copy.

`vercel.json` tells Vercel to run `python3 scripts/build.py` and serve `_site`.

The canonical address is set in `scripts/build.py` as `SITE`.

## Pull requests

The GitHub workflow (`.github/workflows/build.yml`) builds every push and pull request without deploying it. A failed build means a data file broke one of the rules in [checks.md](checks.md).

## Files for search engines

`make build` writes two files beside the page:

- `robots.txt` allows every crawler and points to `sitemap.xml`.
- `sitemap.xml` lists every page: the home page and one page per year. The addresses are built from `SITE` in `scripts/build.py`.

Each sitemap entry carries a last-modified date. The build prints where the date came from:

| Situation | Date used |
|---|---|
| Full git history | The last commit that touched `data/`, `assets/` or `scripts/build.py`, the three things the page is built from |
| Shallow clone whose history stops before that commit | The oldest commit it has. The page changed on or before that date |
| No git | The build date |

## Year pages

Each year also has a page of its own, so a search can land on that year instead of the whole chronology.

- **Address:** `/year/<id>/`, where `<id>` is the year's `id` in `data/years.json`. The first is `/year/before-1964/`. There are 28.
- **Content:** the same section the home page shows for that year, made by the same `year_html()` call, so the two cannot drift apart. Only the picture addresses differ.
- **Around it:** a smaller masthead that links home, the year band with this year marked, and links to the earlier and later year.
- **Head:** its own title (`Osho discourses in 1975: A discourse every morning`), a description cut from the year's lede at 155 characters, itself as canonical, and a `CollectionPage` JSON-LD block that points to the site.
- **Styles:** the home page's `assets/site.css`, plus `assets/pages.css` for the masthead and the earlier and later links. The home page does not load `pages.css`.

`vercel.json` sets `trailingSlash` to `true`, so `/year/1975` redirects to `/year/1975/`. Addresses that end in a file extension, such as the stylesheet, are not redirected.

That includes `/year/1975/index.html`, which still serves the page. Nothing on the site links to that form, and the page's canonical tag names `/year/1975/`.

These addresses are public once deployed. Changing a year's `id` changes its address, so add a redirect in `vercel.json` if one ever has to change.

The home page does not link to the year pages yet. Search engines find them through `sitemap.xml`.

## The picture shown when the site is shared

Chat apps and social sites show a picture beside a link to the site. The page names it in its `og:image` tag.

- The picture in use is set by `OG_IMAGE` in `scripts/build.py`. Today it is `assets/og/medallion.png`.
- `assets/og/` holds three designs: `masthead.png`, `arch.png` and `medallion.png`. To switch, change `OG_IMAGE`.
- All three are drawn by `scripts/og.html`, which is not part of the site. They use the site's fonts and colours and no photograph.
- The build fails unless the picture is a whole, undamaged PNG, 1200 by 630 pixels and under 300 KB.
- The address in the tag ends in `?v=` and a short hash of the file, as the stylesheet's does. A redrawn picture therefore gets a new address.

To redraw one after editing `scripts/og.html`, render it with headless Chrome. Replace `medallion` with the design's name in both places:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --screenshot="$PWD/assets/og/medallion.png" "file://$PWD/scripts/og.html#medallion"
```

## Structured data

The page's `<head>` carries one JSON-LD block that tells search engines what the site is. `json_ld()` in `scripts/build.py` writes it.

| Item | What it says |
|---|---|
| `WebSite` | The site's name, address, description and language |
| `Dataset` | The chronology: its name, description, the years it covers, its licence (CC BY-NC-ND 4.0, as in `LICENSE-DATA`), the Sannyas Wiki as its source, and that it is free to read |

- The years come from the first and last entries in `data/years.json`, so they follow the data.
- The creator is the site itself, an `Organization` named `oshodiscourses.com`. No person is named.
- The build serialises the block and parses it back, and fails if the two differ.

The build can only show that the block is valid JSON.

Google's Dataset guide says to validate with the Rich Results Test, run on the live address. That test covers the `Dataset` item. It has nothing to report for `WebSite`, and a pass does not mean Google will use the markup.

## Checking that the home page did not change

Some changes must leave the home page exactly as visitors see it. Save a copy before the change, then compare after:

```bash
make build && cp _site/index.html /tmp/index.baseline.html
```

```bash
make bodycheck BASELINE=/tmp/index.baseline.html
```

The check compares everything from `<body` to `</body>` byte for byte and fails on any difference.

## Analytics

Vercel Web Analytics and Speed Insights are switched on for the project and loaded by two script tags in the page, as Vercel documents for plain HTML sites. No npm package is needed. The scripts are served by Vercel, so they return 404 under `make serve`; that is expected.

## The domain

`oshodiscourses.com` is registered at GoDaddy and points to Vercel with two A records on the root and a `www` CNAME to the root. Vercel issues and renews the HTTPS certificate.
