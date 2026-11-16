# Product

Osho discourse chronology: a static reference site listing Osho's talks in date order, by year, with series, dates, location and talk count. Public GitHub repo, served by GitHub Pages.

## Platform
web

## Stack
Static site. A Python standard-library script (scripts/build.py) builds one HTML page from CSV and JSON data into _site/. One stylesheet, one small script, self-hosted fonts and images, no external requests. GitHub Actions builds and deploys to GitHub Pages.

## Users
Friends of the author who already know Osho and his talks (confirmed by the author, 2026-11-16). They know the names of the well-known series and want to place them in time and place. Not newcomers: no need to explain who Osho was.

## Product Purpose
Let a reader go year by year through the talks and see what was spoken, when, where, and how many talks (confirmed main job: read year by year). Covers 1954 to January 1990, including the years in the United States and the 1986 world tour.

## Positioning
A compact, honest digest of the Sannyas Wiki year timelines, which are exhaustive but hundreds of rows per year.

## Operating Context
Read on a laptop or phone, at leisure, usually from a shared link to the GitHub Pages site.

## Capabilities and Constraints
- Data source: Sannyas Wiki "Osho Timeline" year pages, plus Osho Source Book and Neeten's Ranakpur paper for the first camp.
- Talk counts are rows on the wiki, not verified totals.
- Which talks have surviving audio was not checked; the page must say so.
- Many titles are later book compilations of scattered talks.
- Talks are in Hindi or English; rows carry a language tag where a year mixes both.

## Brand Commitments
No ashram, foundation or publisher branding; this is an independent reference. No photographs of Osho, and no photograph whose subject is an identifiable private person. No em-dashes in copy. The visual system is in DESIGN.md.

## Evidence on Hand
The year files in data/talks/, compiled on 2026-11-16 and compared with the raw wiki pages by scripts/wiki_check.py.

## Product Principles
- Uncertainty stays attached to the row it belongs to.
- Chronology is the spine; nothing reorders it.
- Sources are always one click away.

## Accessibility & Inclusion
WCAG AA contrast, keyboard reachable, readable at phone width, respects reduced motion. Hindi titles are romanised as on the wiki.
