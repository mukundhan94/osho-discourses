// Facts about the site as a whole, and the head tags every page shares.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Year } from "../data/index.ts";
import { REPO_ROOT } from "../data/index.ts";

export const SITE = "https://oshodiscourses.com/";
export const SITE_NAME = "Osho: the discourses";
export const REPO = "https://github.com/mukundhan94/osho-discourses";
export const WIKI = "https://www.sannyas.wiki/index.php?title=Osho_Timeline";
export const OG_IMAGE = "assets/og/medallion.png";
export const OG_IMAGE_ALT = "Osho: the discourses, 1954 to 1990, a year-by-year chronology";
export const OG_SIZE = { width: 1200, height: 630 };
export const SOURCES: [title: string, url: string][] = [
  ["Sannyas Wiki, Osho Timeline (index of year pages)", WIKI],
  ["Osho Source Book, Part Two", "https://oshosourcebook.com/part-two/"],
  ["Neeten, Osho's First Book From His First Camp (PDF)", "https://www.pierreevald.dk/wp-content/uploads/RanakpurCamp.pdf"],
];

/** Short content hash of a file in assets/, so a changed stylesheet is never served from a stale cache. */
export function assetVersion(name: string): string {
  return createHash("sha256").update(fs.readFileSync(path.join(REPO_ROOT, "assets", name))).digest("hex").slice(0, 10);
}

/** A year page's address, relative to the site root. */
export function yearUrl(year: Year): string {
  return `year/${year.id}/`;
}

/** Page title for one year. A single year reads "in 1975"; a range reads "from 1954 to 1963". */
export function yearTitle(year: Year): string {
  const when = /^[0-9]{4}$/.test(year.label) ? `in ${year.label}` : `from ${year.label}`;
  return `Osho discourses ${when}: ${year.heading}`;
}

/** Shorten to a whole number of words within `limit` characters, for a meta description. */
export function clip(text: string, limit = 155): string {
  const chars = [...text];
  if (chars.length <= limit) return text;
  const head = chars.slice(0, limit).join("");
  const cut = head.includes(" ") ? head.slice(0, head.lastIndexOf(" ")) : head;
  return cut.replace(/[ ,;:.]+$/, "") + "…";
}

/** Structured data as the text of a script element. "<" cannot end the element early once it is an escape. */
export function ldText(data: unknown): string {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}
