// Loads the files in data/ and applies the checks scripts/build.py applies when it
// loads them. Each fault message is the one build.py stops with.
import fs from "node:fs";
import path from "node:path";
import { readTable, records } from "./csv.ts";
import { compare, DataError, repr, reprList } from "./errors.ts";
import { norm } from "./norm.ts";

export const KINDS = ["camp", "darshan", "interview", "series", "untitled"] as const;
export const LANGS = ["", "hi", "en"] as const;
export const COLUMNS = ["sort", "dates", "title", "place", "towns", "talks", "kind", "unsure", "note", "lang"] as const;
export const LINK_KINDS = ["listen", "read", "watch"] as const;
export const WIKI = "https://www.sannyas.wiki/index.php?title=Osho_Timeline";

export type Kind = (typeof KINDS)[number];
export type Lang = (typeof LANGS)[number];

/** One line of data/talks/<year>.csv. */
export type Row = {
  sort: string;
  dates: string;
  title: string;
  place: string;
  towns: string;
  talks: string;
  kind: Kind;
  unsure: "" | "y";
  note: string;
  lang: Lang;
  /** The towns column split on ";". */
  townList: string[];
};

export type Photo = { file: string; [key: string]: unknown };

/** One entry of data/years.json, with the defaults build.py fills in. */
export type Year = {
  id: string;
  label: string;
  numeral: string;
  nav: string;
  source: string;
  photo?: Photo;
  [key: string]: unknown;
};

/** One line of data/media.csv: every column is kept as text. */
export type Media = Record<string, string>;

/** One line of data/links.csv. */
export type Link = { title: string; kind: (typeof LINK_KINDS)[number]; label: string; url: string };

export type Places = Map<string, [lat: number, lon: number]>;

const sameList = (a: readonly string[] | undefined, b: readonly string[]) =>
  a !== undefined && a.length === b.length && a.every((x, i) => x === b[i]);

export function loadPlaces(root: string): Places {
  const table = readTable(path.join(root, "data", "places.csv"));
  return new Map(records(table).map((r) => [r["town"]!, [Number(r["lat"]), Number(r["lon"])]]));
}

export function loadRows(root: string, yearId: string, places: Places): Row[] {
  const name = `${yearId}.csv`;
  const table = readTable(path.join(root, "data", "talks", name));
  if (!sameList(table.header, COLUMNS)) throw new DataError(`${name}: header must be ${COLUMNS.join(",")}`);
  const rows = table.rows.map((fields, i) => {
    const at = `${name}:${i + 2}`;
    if (fields.length !== COLUMNS.length) throw new DataError(`${at}: wrong number of fields`);
    const r = Object.fromEntries(COLUMNS.map((c, j) => [c, fields[j]!])) as Record<(typeof COLUMNS)[number], string>;
    if (!(KINDS as readonly string[]).includes(r.kind)) throw new DataError(`${at}: kind must be one of ${reprList([...KINDS])}`);
    if (r.unsure !== "" && r.unsure !== "y") throw new DataError(`${at}: unsure must be empty or y`);
    if (!(LANGS as readonly string[]).includes(r.lang)) throw new DataError(`${at}: lang must be hi, en or empty`);
    if (fields.join("").includes("—")) throw new DataError(`${at}: em-dash found`);
    const townList = r.towns.split(";").map((t) => t.trim()).filter(Boolean);
    for (const t of townList) {
      if (!places.has(t)) throw new DataError(`${at}: town ${repr(t)} is not in places.csv`);
    }
    return { ...r, townList } as Row;
  });
  // Array.prototype.sort is stable, as Python's sorted() is: rows that share a key keep file order.
  return rows.sort((a, b) => compare(a.sort, b.sort));
}

/** Links and counts per series from data/media.csv, keyed by normalised wiki title. */
export function loadMedia(root: string): Map<string, Media> {
  const file = path.join(root, "data", "media.csv");
  if (!fs.existsSync(file)) return new Map();
  return new Map(records(readTable(file)).map((r) => [r["key"]!, r]));
}

/** Hand-added links from data/links.csv, grouped by normalised series title, in file order. */
export function loadLinks(root: string): Map<string, Link[]> {
  const file = path.join(root, "data", "links.csv");
  const out = new Map<string, Link[]>();
  if (!fs.existsSync(file)) return out;
  const table = readTable(file);
  if (!sameList(table.header, ["title", "kind", "label", "url"])) {
    throw new DataError("links.csv: header must be title,kind,label,url");
  }
  records(table).forEach((r, i) => {
    const at = `links.csv:${i + 2}`;
    if (!r["title"]!.trim() || !r["label"]!.trim()) throw new DataError(`${at}: title and label are required`);
    if (!(LINK_KINDS as readonly string[]).includes(r["kind"]!)) {
      throw new DataError(`${at}: kind must be one of ${reprList([...LINK_KINDS])}`);
    }
    if (!r["url"]!.startsWith("https://")) throw new DataError(`${at}: url must start with https://`);
    const key = norm(r["title"]!);
    out.set(key, [...(out.get(key) ?? []), r as Link]);
  });
  return out;
}

/** data/years.json in page order, each entry with build.py's defaults filled in. */
export function loadYears(root: string): Year[] {
  const raw = JSON.parse(fs.readFileSync(path.join(root, "data", "years.json"), "utf8")) as Partial<Year>[];
  return raw.map((y) => {
    const id = y.id as string;
    return { ...y, id, label: y.label ?? id, numeral: y.numeral ?? id, nav: y.nav ?? id.slice(-2), source: y.source ?? `${WIKI}_${id}` };
  });
}

/** A year's photograph must be in assets/img/ and credited in assets/img/CREDITS.md. */
export function checkPhoto(root: string, year: Year): void {
  const photo = year.photo;
  if (!photo) return;
  const img = path.join(root, "assets", "img");
  if (!fs.existsSync(path.join(img, photo.file))) {
    throw new DataError(`${year.id}: photo ${photo.file} is not in assets/img/`);
  }
  if (!fs.readFileSync(path.join(img, "CREDITS.md"), "utf8").includes("`" + photo.file + "`")) {
    throw new DataError(`${year.id}: photo ${photo.file} is not listed in assets/img/CREDITS.md`);
  }
}
