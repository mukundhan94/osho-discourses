// robots.txt and sitemap.xml, and the date the sitemap gives every page. Ports of
// page_lastmod() and sitemap_xml() in scripts/build.py.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { Site } from "../data/index.ts";
import { seriesUrl } from "./series.ts";
import { SITE, yearUrl } from "./site.ts";

/** Everything the pages are built from. A commit to any of these changes the pages. */
export const PAGE_SOURCES = ["data", "assets", "web/src"];

export const ROBOTS = `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`;

/** Every page's address in sitemap order: the home page, the years, then the series. */
export function pageUrls(site: Site): string[] {
  return [SITE, ...site.years.map((y) => SITE + yearUrl(y)), ...site.series.map((x) => SITE + seriesUrl(x))];
}

function git(root: string, ...args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", timeout: 10_000, stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

/**
 * The date the pages last changed, for the sitemap, and where that date came from.
 *
 * In a shallow clone the oldest commit looks as if it added every file, so a date
 * read from it is only an upper bound. Without git, use today's date.
 */
export function pageLastmod(root: string): { date: string; source: string } {
  const found = git(root, "log", "-1", "--format=%H %cs", "--", ...PAGE_SOURCES);
  if (!/^[0-9a-f]{40} [0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(found)) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      source: "build date (git history not available)",
    };
  }
  const [commit, date] = found.split(" ") as [string, string];
  const shallowFile = git(root, "rev-parse", "--git-path", "shallow");
  const shallowPath = shallowFile ? path.resolve(root, shallowFile) : "";
  const boundary = shallowPath && fs.existsSync(shallowPath) ? fs.readFileSync(shallowPath, "utf8").split(/\s+/) : [];
  if (boundary.includes(commit)) {
    return { date, source: "oldest commit in a shallow clone (the pages changed on or before this date)" };
  }
  return { date, source: "last commit touching " + PAGE_SOURCES.join(", ") };
}

const escapeXml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");

export function sitemapXml(urls: string[], lastmod: string): string {
  const items = urls.map((u) => `  <url><loc>${escapeXml(u)}</loc><lastmod>${lastmod}</lastmod></url>\n`).join("");
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + items + "</urlset>\n";
}
