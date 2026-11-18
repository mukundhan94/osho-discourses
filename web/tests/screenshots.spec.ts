// Photographs a built copy of the site, so two builds can be compared picture by picture.
//
//   npm run shots:reference   take the reference pictures from PARITY_DIR
//   npm run shots:compare     photograph PARITY_DIR again and compare with the reference
//
// From the repo root, `make shots` does both: reference from _site/, compare with web/dist/.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { quiet, started } from "./helpers.ts";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// How many pixels may differ in one picture. Set after measuring the noise between two
// runs of the same build; see docs/checks.md. Measured at 0 on 2026-11-17.
const MAX_DIFF_PIXELS = Number(process.env.PARITY_MAX_DIFF_PIXELS ?? 0);

const years: { id: string }[] = JSON.parse(
  fs.readFileSync(fileURLToPath(new URL("../../data/years.json", import.meta.url)), "utf8"),
);

// Twenty series, chosen to cover each kind of series page: series, camp, darshan diary,
// interviews and untitled talks; one row and many; one year and many; with and without a map.
const series = [
  "antar-ki-khoj",
  "beyond-psychology",
  "golden-birthday-celebration-1981",
  "jeevan-alok",
  "kaha-kahun-us-des-ki",
  "krishna-meri-drishti-mein",
  "mahaveer-meri-drishti-mein",
  "mahaveer-ya-mahavinash",
  "nothing-to-lose-but-your-head",
  "rare-hindi-talks-from-1962",
  "sadhana-path",
  "silent-period",
  "swayam-ki-satta",
  "the-inward-revolution",
  "the-last-testament-vol-1",
  "the-last-testament-vol-4",
  "the-last-testament-vol-5",
  "unknown-interview-by-sw-ageh-bharti",
  "unpublished-translation-mount-abu-1972",
  "vigyan-bhairav-tantra-vol-1",
];

// Things that change with time or scroll position, pinned so both builds are photographed
// in the same state: no motion, the sticky year band unstuck so it cannot cover a section
// (relative, not static: the band must stay a stacking context or the current-year circle
// drops behind its background),
// and every year's rail stud inked in (the home page inks it as the year scrolls past).
const STEADY = `
  *, *::before, *::after { transition: none !important; animation: none !important; }
  html { scroll-behavior: auto !important; }
  .years { position: relative !important; }
`;

async function settle(page: Page, url: string) {
  await page.goto(url, { waitUntil: "load" });
  // The year band, the search and the tour start a moment after the page loads. Astro
  // marks each with an `ssr` attribute until it has started; the Python build has none.
  await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
  await started(page);
  await page.addStyleTag({ content: STEADY });
  await page.evaluate(async () => {
    document.querySelectorAll(".year").forEach((y) => y.classList.add("arrived"));
    // Pictures below the fold load lazily; ask for them all, then wait for each.
    const images = Array.from(document.images);
    images.forEach((img) => (img.loading = "eager"));
    await Promise.all(images.map((img) => (img.complete ? null : new Promise((done) => (img.onload = img.onerror = done)))));
    await Promise.all(images.map((img) => img.decode().catch(() => null)));
    await document.fonts.ready;
    // Year and series pages centre the current year in the band as soon as they load. If the
    // fonts arrive after that, the band sits a few pixels off, differently on each run. Centre
    // it again now that the fonts are in.
    const here = document.querySelector<HTMLElement>(".years [aria-current]");
    const band = here?.parentElement;
    if (here && band) band.scrollLeft = here.offsetLeft - (band.clientWidth - here.offsetWidth) / 2;
  });
  // On the home page, read down to the first year and come back before any picture.
  // Chrome draws the year band's text one pixel higher or lower on a phone depending on
  // when a script first read the band's scroll position, which differs between the two
  // builds and from run to run. The layout is the same either way, and once the page has
  // been scrolled both builds draw it the same.
  if (await page.locator('.years a[href^="#y-"]').count()) {
    await page.evaluate(() => document.querySelector(".year")!.scrollIntoView({ behavior: "instant" }));
    await quiet(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await quiet(page);
  }
}

async function same(target: Page | Locator, name: string, fullPage = false, soft = false) {
  // Bring the part into view first and let the page react to the scroll, so the picture
  // never catches the year band between two states.
  if (!fullPage) {
    await (target as Locator).scrollIntoViewIfNeeded();
    await quiet((target as Locator).page());
  }
  const picture = fullPage ? await (target as Page).screenshot({ fullPage: true }) : await target.screenshot();
  // threshold 0: a pixel counts as different if its colour differs at all.
  (soft ? expect.soft : expect)(picture).toMatchSnapshot(`${name}.png`, { maxDiffPixels: MAX_DIFF_PIXELS, threshold: 0 });
}

// The home page is too tall for one picture, so it is photographed part by part. Soft
// checks, so one differing part does not hide the others.
test("home page", async ({ page }) => {
  await settle(page, "/");
  for (const [name, selector] of [
    ["home-masthead", "header.mast"],
    ["home-year-band", "nav.years"],
    ["home-reading-tour", "section.reading"],
    ["home-footer", "footer"],
    ...years.map((y) => [`home-year-${y.id}`, `#y-${y.id}`]),
  ]) {
    await same(page.locator(selector), name, false, true);
  }
});

for (const y of years) {
  test(`year-${y.id}`, async ({ page }) => {
    await settle(page, `/year/${y.id}/`);
    await same(page, `year-${y.id}`, true);
  });
}

for (const slug of series) {
  test(`series-${slug}`, async ({ page }) => {
    await settle(page, `/series/${slug}/`);
    await same(page, `series-${slug}`, true);
  });
}
