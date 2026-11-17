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
- `sitemap.xml` lists the site's URLs, built from `SITE` in `scripts/build.py`.

Each sitemap entry carries a last-modified date. The build prints where the date came from:

| Situation | Date used |
|---|---|
| Full git history | The last commit that touched `data/`, `assets/` or `scripts/build.py`, the three things the page is built from |
| Shallow clone whose history stops before that commit | The oldest commit it has. The page changed on or before that date |
| No git | The build date |

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
