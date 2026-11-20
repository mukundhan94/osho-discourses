# Publishing

The site is a folder of static files. `make build` writes it to `web/dist/`, which is not committed. The build is Astro with React, in `web/`.

## Where it is served

| Address | Host | How it updates |
|---|---|---|
| https://oshodiscourses.com/ | Vercel (Hobby plan) | Every push to `main` |

`www.oshodiscourses.com` redirects to the address above (a permanent redirect set on the domain in Vercel). GitHub Pages is turned off.

The stylesheet links carry a short content hash (`site.css?v=...`), so a change is never hidden by a cached copy.

`vercel.json` tells Vercel what to run and what to serve:

| Setting | Value |
|---|---|
| Install | `npm --prefix web ci` |
| Build | `node -v && npm --prefix web run build` |
| Served folder | `web/dist` |

The build type-checks, writes the site, then runs the checks in [checks.md](checks.md) on it. A fault stops the build.

Vercel builds on Node 24.x. That is set in the Vercel project (Settings, Build and Deployment, Node.js Version), not in this repo: `.nvmrc` pins the same version for CI and for work on your own machine. `node -v` prints the version at the top of each build log, so a mismatch can be seen.

The canonical address is `SITE` in `web/src/lib/site.ts`.

To go back to an earlier state of the site, revert the commit on `main` with a pull request. Vercel's dashboard can also roll back one deployment, but after that it stops publishing new pushes until a deployment is promoted by hand.

## Pull requests

The GitHub workflow (`.github/workflows/build.yml`) runs the tests and builds every push and pull request without deploying it. A failed build usually means a data file broke one of the rules in [checks.md](checks.md).

## Files for search engines

The build writes two files beside the pages:

- `robots.txt` allows every crawler and points to `sitemap.xml`.
- `sitemap.xml` lists every page: the home page, one page per year and one per series (575 in all). The addresses are built from `SITE` in `web/src/lib/site.ts`.

Each sitemap entry carries a last-modified date. The build prints where the date came from:

| Situation | Date used |
|---|---|
| The commit is in the history that was cloned | The last commit that touched `data/`, `assets/` or `web/src/`, the three things the pages are built from |
| Shallow clone whose history stops before that commit | The oldest commit it has. The pages changed on or before that date |
| No git | The build date |

Vercel clones only the last ten commits, so on Vercel the second row applies whenever that commit is more than ten commits back.

## Year pages

Each year also has a page of its own, so a search can land on that year instead of the whole chronology.

- **Address:** `/year/<id>/`, where `<id>` is the year's `id` in `data/years.json`. The first is `/year/before-1964/`. There are 28.
- **Content:** the same section the home page shows for that year, made by the same `YearSection` component, so the two cannot drift apart. Only the picture addresses differ.
- **Around it:** a smaller masthead that links home, the year band with this year marked, and links to the earlier and later year.
- **Head:** its own title (`Osho discourses in 1975: A discourse every morning`), a description cut from the year's lede at 155 characters, itself as canonical, and a `CollectionPage` JSON-LD block that points to the site.
- **Styles:** the home page's `assets/site.css`, plus `assets/pages.css` for the masthead and the earlier and later links. The home page does not load `pages.css`.

`vercel.json` sets `trailingSlash` to `true`, so `/year/1975` redirects to `/year/1975/`. Addresses that end in a file extension, such as the stylesheet, are not redirected.

That would leave `/year/1975/index.html` serving the page as a second address, so `vercel.json` also redirects `/index.html` to `/`, `/year/<id>/index.html` to `/year/<id>/` and `/series/<slug>/index.html` to `/series/<slug>/`.

A new kind of page in its own folder needs its own redirect rule there.

These addresses are public once deployed. Changing a year's `id` changes its address, so add a redirect in `vercel.json` if one ever has to change.

On the home page each year's numeral leads to its year page. A year page's own numeral is not a link.

## Series pages

Each titled series has a page too, so a search for one series can land on it.

- **Address:** `/series/<slug>/`, for example `/series/beyond-psychology/`. There are 546.
- **Which rows:** a row belongs to the series that `data/media.csv` matches its title to, the same match that gives the row its Listen, Video and Wiki links. Rows with no match (talks grouped by town, mostly) have no series page and appear only on their year page.
- **Content:** every row of the series, grouped under the year it falls in, with the same links as on the year page. Beside it: the first year, the towns, a count, and a map when the series was given in more than one town.
- **Head:** its own title (`Beyond Psychology (1986), Osho discourse series`), a description built from the rows, itself as canonical, and a `CreativeWorkSeries` JSON-LD block that names the wiki page as `sameAs`.
- **Links:** each year heading leads to that row on the year page, and two links lead to the series before and after it by date. On the home page and on year pages each series title leads to its series page, and a year page's JSON-LD lists them as `hasPart`. The example rows in the reading tour are not links.

### Slugs do not change

`data/slugs.csv` holds one row per series: its key in `data/media.csv` and its slug. The slug is the key with spaces turned into hyphens.

- The build never invents an address. A series with no row in `slugs.csv` stops the build; run `make slugs` to add the missing rows, then commit the file.
- A row whose series no longer exists also stops the build. Its page is public, so add a redirect for it in `vercel.json` before removing the row.
- To keep an address when the wiki renames a series, change the row's `key` and leave its `slug`.

## The picture shown when the site is shared

Chat apps and social sites show a picture beside a link to the site. The page names it in its `og:image` tag.

- The picture in use is set by `OG_IMAGE` in `web/src/lib/site.ts`. Today it is `assets/og/medallion.png`.
- `assets/og/` holds three designs: `masthead.png`, `arch.png` and `medallion.png`. To switch, change `OG_IMAGE`.
- All three are drawn by `scripts/og.html`, which is not part of the site. They use the site's fonts and colours and no photograph.
- The build fails unless the picture is a whole, undamaged PNG, 1200 by 630 pixels and under 300 KB.
- The address in the tag ends in `?v=` and a short hash of the file, as the stylesheet's does. A redrawn picture therefore gets a new address.

To redraw one after editing `scripts/og.html`, render it with headless Chrome. Replace `medallion` with the design's name in both places:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --screenshot="$PWD/assets/og/medallion.png" "file://$PWD/scripts/og.html#medallion"
```

## Structured data

The home page's `<head>` carries one JSON-LD block that tells search engines what the site is. `homeLd()` in `web/src/lib/site.ts` writes it.

| Item | What it says |
|---|---|
| `WebSite` | The site's name, address, description and language |
| `Dataset` | The chronology: its name, description, the years it covers, its licence (CC BY-NC-ND 4.0, as in `LICENSE-DATA`), the Sannyas Wiki as its source, and that it is free to read |

- The years come from the first and last entries in `data/years.json`, so they follow the data.
- The creator is the site itself, an `Organization` named `oshodiscourses.com`. No person is named.

The build can only show that the block is valid JSON.

Google's Dataset guide says to validate with the Rich Results Test, run on the live address. That test covers the `Dataset` item. It has nothing to report for `WebSite`, and a pass does not mean Google will use the markup.

## Scripts

Every page loads React and a small year band component, about 70 KB compressed. The home page also loads the series search and the reading tour. They are written by the build into `/_astro/`, with a hash of their content in each file name.

Because a changed file gets a new name, `vercel.json` tells browsers to keep everything under `/_astro/` for a year without asking again (`Cache-Control: public, max-age=31536000, immutable`). Do not put a file there by hand, or under a name without a hash: a browser that has it would not fetch a newer one. Every other file keeps Vercel's default, which is to check on each visit; the stylesheets and pictures under `/assets/` rely on that, with a `?v=` hash in the links to them.

Without script the pages still read in full: the band is a row of links, the tour shows all four cards, and the search box stays hidden.

## Analytics

Vercel Web Analytics and Speed Insights are switched on for the project and loaded by two script tags in the page, as Vercel documents for plain HTML sites. No npm package is needed. The scripts are served by Vercel, so they return 404 under `make serve`; that is expected.

## The domain

`oshodiscourses.com` is registered at GoDaddy and points to Vercel with two A records on the root and a `www` CNAME to the root. Vercel issues and renews the HTTPS certificate.
