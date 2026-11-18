// The small map beside a year: which window it shows, where each town falls, and
// which towns get a label. Ports of the map functions in scripts/build.py; every
// number is formatted as Python formats it.
import fs from "node:fs";
import path from "node:path";
import type { Places, Row } from "../data/index.ts";
import { fixed, general } from "./format.ts";
import { townWeights } from "./rows.ts";

/** Map canvas in SVG units. */
export const MAP_W = 265;
export const MAP_H = 234;
/** The window used when every town of a year is in central and northern India. */
const INDIA = { lon0: 68, lon1: 90, lat0: 15.5, lat1: 33 };

export type LatLon = [lat: number, lon: number];
export type Point = [x: number, y: number];
export type Window = { lon0: number; lon1: number; lat0: number; lat1: number; india: boolean };

/** The window fitted to the towns: India when all are inside it, else their extent grown to the canvas shape. */
export function windowFor(coords: LatLon[]): Window {
  if (coords.every(([lat, lon]) => INDIA.lat0 <= lat && lat <= INDIA.lat1 && INDIA.lon0 <= lon && lon <= INDIA.lon1)) {
    return { ...INDIA, india: true };
  }
  const lats = coords.map((c) => c[0]);
  const lons = coords.map((c) => c[1]);
  let lon0 = Math.min(...lons) - 14;
  let lon1 = Math.max(...lons) + 14;
  let lat0 = Math.min(...lats) - 12;
  let lat1 = Math.max(...lats) + 12;
  const aspect = MAP_W / MAP_H;
  if ((lon1 - lon0) / (lat1 - lat0) < aspect) {
    const grow = (lat1 - lat0) * aspect - (lon1 - lon0);
    [lon0, lon1] = [lon0 - grow / 2, lon1 + grow / 2];
  } else {
    const grow = (lon1 - lon0) / aspect - (lat1 - lat0);
    [lat0, lat1] = [lat0 - grow / 2, lat1 + grow / 2];
  }
  return { lon0, lon1, lat0, lat1, india: false };
}

const KX = Math.cos(23 * (Math.PI / 180));

export function projector(win: Window): (lat: number, lon: number) => Point {
  if (win.india) {
    const scale = MAP_H / (win.lat1 - win.lat0);
    return (lat, lon) => [(lon - win.lon0) * KX * scale, (win.lat1 - lat) * scale];
  }
  const scale = MAP_W / (win.lon1 - win.lon0);
  return (lat, lon) => [(lon - win.lon0) * scale, (win.lat1 - lat) * scale];
}

/** An outline in plain longitude and negated latitude; each map scales it with a transform. */
export function rawPath(rings: [lon: number, lat: number][][]): string {
  return rings.map((ring) => "M" + ring.map(([lon, lat]) => `${general(lon)},${general(-lat)}`).join("L") + "Z").join("");
}

/** The shared outline a window uses, and the transform that maps it into the window. */
export function outlineUse(win: Window): { href: string; transform: string } {
  if (win.india) {
    const scale = MAP_H / (win.lat1 - win.lat0);
    const a = KX * scale;
    return {
      href: "#o-india",
      transform: `matrix(${fixed(a, 4)} 0 0 ${fixed(scale, 4)} ${fixed(-win.lon0 * a, 2)} ${fixed(win.lat1 * scale, 2)})`,
    };
  }
  const scale = MAP_W / (win.lon1 - win.lon0);
  return {
    href: "#o-world",
    transform: `matrix(${fixed(scale, 4)} 0 0 ${fixed(scale, 4)} ${fixed(-win.lon0 * scale, 2)} ${fixed(win.lat1 * scale, 2)})`,
  };
}

export type Label = { x: string; y: string; anchor: "start" | "end" | "middle"; town: string };
type Box = [x0: number, y0: number, x1: number, y1: number];

/**
 * Greedy label placement: try right, left, below, above; skip on collision.
 *
 * The first `must` towns (the towns line above the map) may sit over the dots
 * of lower-ranked towns if nothing else fits, so the map always names them.
 */
export function placeLabels(ranked: string[], points: Map<string, Point>, limit = 7, must = 4): Label[] {
  const boxes: Box[] = [];
  const out: Label[] = [];
  const placed: Point[] = [];

  const clash = ([x0, y0, x1, y1]: Box, own: string, strict: boolean) => {
    if (x0 < 2 || y0 < 2 || x1 > MAP_W - 2 || y1 > MAP_H - 2) return true;
    if (boxes.some(([bx0, by0, bx1, by1]) => x0 < bx1 && bx0 < x1 && y0 < by1 && by0 < y1)) return true;
    const others = strict ? [...points.keys()].filter((t) => t !== own) : ranked.slice(0, ranked.indexOf(own));
    return others.some((t) => {
      const [px, py] = points.get(t)!;
      return x0 - 2 < px && px < x1 + 2 && y0 - 2 < py && py < y1 + 2;
    });
  };

  for (const town of ranked) {
    if (out.length >= limit) break;
    const [x, y] = points.get(town)!;
    // A town whose dot sits on a higher-ranked labelled dot stays unlabelled.
    if (placed.some(([px, py]) => Math.abs(x - px) < 10 && Math.abs(y - py) < 10)) continue;
    const w = [...town].length * 6.3 + 2;
    const options: [number, number, Label["anchor"], Box][] = [
      [x + 8, y + 4, "start", [x + 7, y - 7, x + 8 + w, y + 7]],
      [x - 8, y + 4, "end", [x - 8 - w, y - 7, x - 7, y + 7]],
      [x, y + 18, "middle", [x - w / 2, y + 8, x + w / 2, y + 21]],
      [x, y - 9, "middle", [x - w / 2, y - 21, x + w / 2, y - 8]],
      [x + 7, y - 6, "start", [x + 6, y - 17, x + 7 + w, y - 3]],
      [x + 7, y + 14, "start", [x + 6, y + 3, x + 7 + w, y + 17]],
      [x - 7, y - 6, "end", [x - 7 - w, y - 17, x - 6, y - 3]],
      [x - 7, y + 14, "end", [x - 7 - w, y + 3, x - 6, y + 17]],
    ];
    const tries = ranked.indexOf(town) < must ? [true, false] : [true];
    search: for (const strict of tries) {
      for (const [lx, ly, anchor, box] of options) {
        if (!clash(box, town, strict)) {
          placed.push([x, y]);
          boxes.push(box);
          out.push({ x: fixed(lx, 1), y: fixed(ly, 1), anchor, town });
          break search;
        }
      }
    }
  }
  return out;
}

/** Which shared outline a set of rows needs on its page, if it gets a map at all. */
export function outlineFor(rows: Row[], places: Places): "india" | "world" | undefined {
  const { weight } = townWeights(rows);
  if (weight.size < 2) return undefined;
  return windowFor([...weight.keys()].map((t) => places.get(t)!)).india ? "india" : "world";
}

/** The two outlines as path data, from data/india-outline.json and data/world-outline.json. */
export function loadOutlines(root: string): { india: string; world: string } {
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(root, "data", name), "utf8"));
  return { india: rawPath([read("india-outline.json").ring]), world: rawPath(read("world-outline.json").rings) };
}
