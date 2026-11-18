// Drives the parts of the site that react to the reader, and writes down what each did:
// the reading tour, the series search and the year band. Run on two builds, the two
// records must be the same.
//
//   npm run shots:reference   take the record from PARITY_DIR
//   npm run shots:compare     drive PARITY_DIR again and compare with the record
//
// `make shots` does both, beside the pictures: record from _site/, compare with web/dist/.
import { expect, test, type Page } from "@playwright/test";
import { quiet, started } from "./helpers.ts";

/** Open a page and wait until its parts that run in the browser have started. */
async function open(page: Page, url: string): Promise<string[]> {
  const faults: string[] = [];
  page.on("pageerror", (error) => faults.push(String(error)));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
  await started(page);
  await page.evaluate(() => document.fonts.ready);
  await quiet(page);
  return faults;
}

const band = (page: Page) =>
  page.evaluate(() => {
    const nav = document.querySelector(".years")!;
    const marked = [...nav.querySelectorAll("[aria-current]")].map((a) => `${a.textContent}=${a.getAttribute("aria-current")}`);
    return `current ${marked.join(",") || "none"}, fade ${nav.classList.contains("more")}, scrolled ${Math.round(nav.scrollLeft)}`;
  });

test("home page: tour, search and year band", async ({ page }) => {
  const faults = await open(page, "/");
  const log: string[] = [];
  const tour = page.locator("[data-tour]");
  const next = page.locator(".tnext");
  const tourState = async () =>
    `step ${await tour.getAttribute("data-step")}, active ${await page.locator(".tcard.active").evaluateAll((els) => els.map((e) => e.id).join(","))}, ` +
    `dots ${await page.locator(".tdots i").evaluateAll((els) => els.map((e) => (e.classList.contains("on") ? "1" : "0")).join(""))}, ` +
    `back disabled ${await page.locator(".tback").isDisabled()}, next "${await next.textContent()}" (${await next.getAttribute("aria-label")})`;

  log.push(`tour: class "${await tour.getAttribute("class")}", controls hidden ${await page.locator(".tnav").evaluate((e) => (e as HTMLElement).hidden)}`);
  log.push(`tour start: ${await tourState()}`);
  for (let i = 1; i <= 5; i++) {
    await next.click();
    log.push(`tour after Next ${i}: ${await tourState()}`);
  }
  await page.locator(".tback").click();
  log.push(`tour after Back: ${await tourState()}`);
  await next.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  log.push(`tour after two right arrows: ${await tourState()}`);
  await page.keyboard.press("ArrowLeft");
  log.push(`tour after a left arrow: ${await tourState()}`);

  const find = page.locator("#find");
  const results = () =>
    page.locator("#find-results li a").evaluateAll((els) => els.map((a) => `${a.querySelector("b")?.textContent} | ${a.querySelector("span")?.textContent} | ${a.getAttribute("href")}`));
  log.push(`search: form hidden ${await page.locator("form.find").evaluate((e) => (e as HTMLElement).hidden)}`);
  for (const q of ["b", "beyond", "GEETA", "zzzz", "sadhana  path", "é", ""]) {
    await find.fill(q);
    const found = await results();
    log.push(`search ${JSON.stringify(q)}: "${await page.locator("#find-count").textContent()}", ${found.length} shown${found.length ? ", first " + found[0] + ", last " + found.at(-1) : ""}`);
  }
  const afterJump = () =>
    page.evaluate(() => {
      const found = [...document.querySelectorAll("tr.found")].map((r) => r.id);
      const row = found[0] ? document.getElementById(found[0])!.getBoundingClientRect() : undefined;
      const middle = row ? Math.abs(row.top + row.height / 2 - window.innerHeight / 2) < 40 : false;
      return `address ${location.hash}, marked ${found.join(",")}, row in the middle of the screen ${middle}, results left ${document.querySelectorAll("#find-results li").length}, count "${document.querySelector("#find-count")!.textContent}", box "${(document.querySelector("#find") as HTMLInputElement).value}"`;
    });
  await find.fill("beyond psychology");
  await find.press("Enter");
  await page.waitForTimeout(250);
  log.push(`search, Enter on "beyond psychology": ${await afterJump()}`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await find.fill("sadhana");
  await page.locator("#find-results li a").nth(1).click();
  await page.waitForTimeout(250);
  log.push(`search, click on the second result for "sadhana": ${await afterJump()}`);

  for (const id of ["y-before-1964", "y-1974", "y-1990"]) {
    await page.evaluate((target) => document.getElementById(target)!.scrollIntoView({ block: "start", behavior: "instant" }), id);
    await page.waitForTimeout(250);
    log.push(`band at ${id}: ${await band(page)}`);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(250);
  log.push(`band at the end of the page: ${await band(page)}`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  log.push(`band back at the top: ${await band(page)}`);
  log.push(`years inked in: ${await page.locator("section.year.arrived").evaluateAll((els) => els.map((e) => e.id.slice(2)).join(","))}`);
  log.push(`footer inked in: ${await page.locator("footer.arrived").count()}`);
  log.push(`faults: ${JSON.stringify(faults)}`);
  expect(log.join("\n") + "\n").toMatchSnapshot("behaviour-home.txt");
});

test("year and series pages: the current year is centred in the band", async ({ page }) => {
  const log: string[] = [];
  for (const url of ["/year/before-1964/", "/year/1974/", "/year/1990/", "/series/sadhana-path/", "/series/beyond-psychology/"]) {
    const faults = await open(page, url);
    // Centre again once the fonts are in, as the screenshot test does, so the number does not depend on when they arrived.
    const centred = await page.evaluate(() => {
      const here = document.querySelector<HTMLElement>(".years [aria-current]")!;
      const nav = here.parentElement!;
      const before = Math.round(nav.scrollLeft);
      nav.scrollLeft = here.offsetLeft - (nav.clientWidth - here.offsetWidth) / 2;
      return Math.abs(Math.round(nav.scrollLeft) - before) <= 3;
    });
    log.push(`${url}: ${await band(page)}, centred on load ${centred}, faults ${JSON.stringify(faults)}`);
  }
  expect(log.join("\n") + "\n").toMatchSnapshot("behaviour-pages.txt");
});
