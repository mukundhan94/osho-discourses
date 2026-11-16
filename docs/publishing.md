# Publishing

The site is a folder of static files. `make build` writes it to `_site/`, which is not committed.

## Where it is served

| Address | Host | How it updates |
|---|---|---|
| https://oshodiscourses.com/ | Vercel (Hobby plan) | Every push to `main` |
| https://mukundhan94.github.io/osho-discourses/ | GitHub Pages | Every push to `main`, through `.github/workflows/pages.yml` |

`vercel.json` tells Vercel to run `python3 scripts/build.py` and serve `_site`.

The canonical address is set in `scripts/build.py` as `SITE`.

## Pull requests

The GitHub workflow builds every pull request without deploying it. A failed build means a data file broke one of the rules in [checks.md](checks.md).

## The domain

`oshodiscourses.com` is registered at GoDaddy and points to Vercel with two DNS records. Vercel issues and renews the HTTPS certificate.
