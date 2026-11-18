// What every page of one build shares, loaded once: the data, the outlines, and the
// address of each series page.
import { loadSite, REPO_ROOT } from "../data/index.ts";
import type { Site } from "../data/index.ts";
import { loadOutlines } from "./maps.ts";

export type Build = {
  site: Site;
  outlines: { india: string; world: string };
  /** Series key to page address, for the titles that link to their series. */
  seriesUrls: Map<string, string>;
};

let cached: Build | undefined;

export function getBuild(): Build {
  if (!cached) {
    const site = loadSite();
    cached = {
      site,
      outlines: loadOutlines(REPO_ROOT),
      seriesUrls: new Map(site.series.map((x) => [x.key, `/series/${x.slug}/`])),
    };
  }
  return cached;
}
