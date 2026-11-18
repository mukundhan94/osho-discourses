import type { CSSProperties } from "react";
import type { Places, Row } from "../data/index.ts";
import { compare } from "../data/errors.ts";
import { fixed } from "../lib/format.ts";
import { MAP_H, MAP_W, outlineUse, placeLabels, projector, windowFor } from "../lib/maps.ts";
import type { Point } from "../lib/maps.ts";
import { MONTHS, monthOf, talkNumber, townWeights } from "../lib/rows.ts";

type Props = {
  /** How the period is named in labels: "1974", or "1974 to 1975". */
  label: string;
  rows: Row[];
  places: Places;
  /** Join the places with a dashed line, in the order of the rows. */
  route?: boolean;
};

/** For a one-place year: listed talks per month, by each row's start date. */
function MonthStrip({ label, rows, town }: { label: string; rows: Row[]; town: string }) {
  const counts = new Array<number>(13).fill(0);
  let undated = 0;
  for (const r of rows) {
    const n = talkNumber(r.talks) || 0;
    const m = monthOf(r);
    if (m) counts[m]! += n;
    else undated += n;
  }
  const top = Math.max(...counts) || 1;
  return (
    <figure className="months">
      <p className="where">{`All in ${town}`}</p>
      <ol aria-label={`Listed talks by month, ${label}`}>
        {MONTHS.slice(1).map((name, i) => {
          const count = counts[i + 1]!;
          return (
            <li key={name} aria-label={`${name}: ${count} talk${count !== 1 ? "s" : ""}`}>
              <span className="bar" style={{ "--v": fixed(count / top, 2) } as CSSProperties}></span>
              <span className="c">{count || ""}</span>
              <span className="m">{name[0]}<span className="rest">{name.slice(1, 3)}</span></span>
            </li>
          );
        })}
      </ol>
      <figcaption>{"Listed talks by month, counted from each entry's start date." + (undated ? ` ${undated} more have no month.` : "")}</figcaption>
    </figure>
  );
}

/** The figure in a year's rail: a map of the places with talks, or a month strip when there is one place. */
export function PlaceMap({ label, rows, places, route = false }: Props) {
  const { weight, camps, ranked } = townWeights(rows);
  if (!weight.size) return null;
  if (weight.size === 1) return <MonthStrip label={label} rows={rows} town={ranked[0]!} />;
  const towns = [...weight.keys()];
  const win = windowFor(towns.map((t) => places.get(t)!));
  const project = projector(win);
  const land = outlineUse(win);
  const points = new Map<string, Point>(towns.map((t) => [t, project(...places.get(t)!)]));
  const at = (t: string) => points.get(t)!.map((v) => fixed(v, 1)) as [string, string];
  // Heaviest towns first, so a small dot is drawn over a large one.
  const dots = towns.filter((t) => !camps.has(t)).sort((a, b) => weight.get(b)! - weight.get(a)!);
  const order = route ? [...new Set(rows.flatMap((r) => r.townList))] : [];
  const n = weight.size;
  const where = win.india ? "central and northern India" : "the world";
  return (
    <figure className="map">
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={`Map of ${where} marking the ${n} place${n !== 1 ? "s" : ""} with listed talks in ${label}`}>
        <use className="land" href={land.href} transform={land.transform} />
        {route ? <polyline className="route" points={order.map((t) => at(t).join(",")).join(" ")} /> : null}
        {dots.map((t) => {
          const [cx, cy] = at(t);
          return <circle key={t} className="town" cx={cx} cy={cy} r={fixed(2.2 + Math.min(4.5, Math.sqrt(weight.get(t)!) * 0.9), 1)} />;
        })}
        {[...camps].sort(compare).map((t) => {
          const [x, y] = points.get(t)!;
          return <rect key={t} className="camp" x={fixed(x - 4.5, 1)} y={fixed(y - 4.5, 1)} width="9" height="9" transform={`rotate(45 ${fixed(x, 1)} ${fixed(y, 1)})`} />;
        })}
        {placeLabels(ranked, points).map((l) => (
          <text key={l.town} x={l.x} y={l.y} textAnchor={l.anchor}>{l.town}</text>
        ))}
      </svg>
      <figcaption>{"Places with listed talks." + (camps.size ? " Diamonds are camps." : "") + (route ? " The dashed line joins them in the order he spoke there." : "")}</figcaption>
    </figure>
  );
}
