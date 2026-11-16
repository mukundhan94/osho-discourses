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

## Analytics

Vercel Web Analytics and Speed Insights are switched on for the project and loaded by two script tags in the page, as Vercel documents for plain HTML sites. No npm package is needed. The scripts are served by Vercel, so they return 404 under `make serve`; that is expected.

## The domain

`oshodiscourses.com` is registered at GoDaddy and points to Vercel with two A records on the root and a `www` CNAME to the root. Vercel issues and renews the HTTPS certificate.
