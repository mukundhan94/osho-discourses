// Checks on the finished site, run after every page is written. A fault stops the build.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { DataError } from "../data/index.ts";
import { OG_IMAGE, OG_SIZE } from "./site.ts";

const HEAD_TAGS = {
  title: /<title>(.*?)<\/title>/g,
  description: /<meta name="description" content="(.*?)">/g,
  canonical: /<link rel="canonical" href="(.*?)">/g,
} as const;

/**
 * Every page needs its own title, description and canonical, and every link inside the
 * site must lead to a file. `pages` are paths inside `dir`, such as "year/1974/index.html".
 */
export function checkPages(dir: string, pages: string[]): void {
  const seen = { title: new Map<string, string>(), description: new Map<string, string>(), canonical: new Map<string, string>() };
  for (const page of pages) {
    const text = fs.readFileSync(path.join(dir, page), "utf8");
    const head = text.split("</head>", 1)[0]!; // the maps have <title> elements of their own
    for (const what of ["title", "description", "canonical"] as const) {
      const found = [...head.matchAll(HEAD_TAGS[what])].map((m) => m[1]!);
      if (found.length !== 1 || !found[0]) throw new DataError(`${page}: needs exactly one ${what}, found ${found.length}`);
      const other = seen[what].get(found[0]);
      if (other !== undefined) throw new DataError(`${page}: has the same ${what} as ${other}`);
      seen[what].set(found[0], page);
    }
    const folder = page.includes("/") ? page.slice(0, page.lastIndexOf("/") + 1) : "";
    for (const link of new Set([...text.matchAll(/(?:href|src)="([^"#]*)/g)].map((m) => m[1]!))) {
      // Addresses outside the site, and Vercel's own scripts, are not ours to check.
      if (!link || /^([a-z]+:|\/\/|\/_vercel\/)/.test(link)) continue;
      let target = (link.startsWith("/") ? link.slice(1) : folder + link).split("?")[0]!;
      if (target === "" || target.endsWith("/")) target += "index.html";
      const file = path.join(dir, target);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        throw new DataError(`${page}: links to ${link}, which is not in the built site`);
      }
    }
  }
}

/** The shared picture must be a whole PNG of the size the tags declare, and small enough to load fast. */
export function checkOgImage(file: string): void {
  const data = fs.readFileSync(file);
  if (!data.subarray(0, 8).equals(Buffer.from("\x89PNG\r\n\x1a\n", "latin1"))) throw new DataError(`${OG_IMAGE}: not a PNG file`);
  const width = data.length >= 24 ? data.readUInt32BE(16) : 0;
  const height = data.length >= 24 ? data.readUInt32BE(20) : 0;
  if (width !== OG_SIZE.width || height !== OG_SIZE.height) {
    throw new DataError(`${OG_IMAGE}: is ${width}x${height}, must be ${OG_SIZE.width}x${OG_SIZE.height}`);
  }
  if (data.length > 300_000) throw new DataError(`${OG_IMAGE}: is ${data.length} bytes, must be under 300 KB`);
  // Walk every chunk: each carries its own checksum, and the pixels must inflate.
  let pos = 8;
  let ended = false;
  const pixels: Buffer[] = [];
  while (pos + 12 <= data.length && !ended) {
    const length = data.readUInt32BE(pos);
    const kind = data.subarray(pos + 4, pos + 8);
    const body = data.subarray(pos + 8, pos + 8 + length);
    const crc = data.subarray(pos + 8 + length, pos + 12 + length);
    if (body.length !== length || crc.length !== 4 || zlib.crc32(Buffer.concat([kind, body])) !== crc.readUInt32BE(0)) break;
    if (kind.toString("latin1") === "IDAT") pixels.push(body);
    ended = kind.toString("latin1") === "IEND";
    pos += 12 + length;
  }
  try {
    zlib.inflateSync(Buffer.concat(pixels));
  } catch {
    ended = false;
  }
  if (!ended) throw new DataError(`${OG_IMAGE}: the PNG is cut short or damaged`);
}
