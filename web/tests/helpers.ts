// Waits shared by the picture test and the behaviour test. Both builds are given the
// same time to settle, so neither is recorded half way through reacting.
import type { Page } from "@playwright/test";

/** Wait until the search box and the tour have shown their controls, on a page that has them. */
export async function started(page: Page) {
  await page.waitForFunction(() => {
    const find = document.querySelector<HTMLElement>("form.find");
    const tour = document.querySelector("[data-tour]");
    return (!find || !find.hidden) && (!tour || tour.classList.contains("js"));
  });
}

/**
 * Let the page finish reacting. The year band marks the year in view a little after a
 * scroll, and how long that takes depends on how busy the machine is, so this waits
 * until the band and the inked-in years have stayed the same for ten frames in a row.
 */
export async function quiet(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        const state = () => {
          const band = document.querySelector(".years");
          return (band?.outerHTML ?? "") + "|" + Math.round(band?.scrollLeft ?? 0) + "|" + document.querySelectorAll(".arrived").length;
        };
        let last = state();
        let steady = 0;
        const started = performance.now();
        const frame = () => {
          const now = state();
          steady = now === last ? steady + 1 : 0;
          last = now;
          if (steady >= 10 || performance.now() - started > 3000) done();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
}
