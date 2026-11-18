import { Fragment } from "react";
import type { ReactNode } from "react";
import type { Link, Media, Photo as PhotoData, Places, Row as RowData, Year } from "../data/index.ts";
import { rowIds } from "../data/index.ts";
import { MONTHS, monthOf, summaryFor, townWeights } from "../lib/rows.ts";
import { PlaceMap } from "./PlaceMap.tsx";
import { Row } from "./Row.tsx";
import { Key } from "./Unsure.tsx";

type Shared = { media: Map<string, Media>; links: Map<string, Link[]>; seriesUrls?: Map<string, string> };

/** The four heaviest towns, as the line under the year numeral. */
export function Towns({ rows }: { rows: RowData[] }) {
  const { ranked } = townWeights(rows);
  return (
    <p className="towns">
      {ranked.slice(0, 4).map((t, i) => (
        <Fragment key={t}>{i ? " " : ""}<span className="keep">{(i ? "\u00b7 " : "") + t}</span></Fragment>
      ))}
    </p>
  );
}

/** The column headings every table of rows has. */
export function TableHead() {
  return (
    <thead>
      <tr>
        <th scope="col" className="dates">Dates</th>
        <th scope="col">Series or talk</th>
        <th scope="col" className="place">Place</th>
        <th scope="col" className="talks">Talks</th>
      </tr>
    </thead>
  );
}

/** A year's rows in order, with a month divider in long years and repeated places marked. */
function Rows({ rows, showLang, ...shared }: { rows: RowData[]; showLang: boolean } & Shared) {
  const ids = rowIds(rows);
  const dividers = rows.length > 20;
  const out: ReactNode[] = [];
  let lastMonth = 0;
  let lastPlace: string | undefined;
  rows.forEach((r, i) => {
    const month = monthOf(r);
    if (dividers && month && month !== lastMonth) {
      out.push(
        <tr key={`m-${ids[i]}`} className="month"><th colSpan={4} scope="rowgroup">{MONTHS[month]}</th></tr>,
      );
      lastMonth = month;
      lastPlace = undefined;
    }
    out.push(<Row key={ids[i]} row={r} rid={ids[i]!} showLang={showLang} samePlace={r.place === lastPlace} {...shared} />);
    lastPlace = r.place;
  });
  return <>{out}</>;
}

function Photo({ photo: p, root }: { photo: PhotoData; root: string }) {
  return (
    <figure className="photo">
      <div className="plate">
        <img src={`${root}assets/img/${p.file}`} alt={p.alt} loading="lazy" width="800" height="533" decoding="async" />
      </div>
      <figcaption>
        {p.caption + " "}<span className="credit">{`${p.credit ?? "Recent photograph by"} ${p.author}, `}<a href={p.licence_url}>{p.licence}</a>, via <a href={p.source_url}>Wikimedia Commons</a>.</span>
      </figcaption>
    </figure>
  );
}

export type YearSectionProps = {
  year: Year;
  rows: RowData[];
  places: Places;
  /** "" on the home page, "/" on pages in folders: the start of every asset address. */
  root: string;
  /** Given on the home page, where the numeral leads to the year's own page. */
  yearHref?: string;
  /** The rail stud is inked in. The home page does this with its script as the year scrolls by. */
  arrived?: boolean;
} & Shared;

/** One year: the rail with its numeral, towns and map, and the body with its table. */
export function YearSection({ year, rows, places, root, yearHref, arrived = false, ...shared }: YearSectionProps) {
  const { text: summary, showLang } = summaryFor(rows);
  const closing = year.closing?.length ? year.closing : undefined;
  return (
    <section className={arrived ? "year arrived" : "year"} id={`y-${year.id}`} aria-labelledby={`h-${year.id}`}>
      <div className="rail">
        <span className="stud" aria-hidden="true"></span>
        <div className="rail-in">
          <h2 id={`h-${year.id}`}>
            <span className="num">{yearHref ? <a href={yearHref}>{year.numeral}</a> : year.numeral}</span>
            {year.numeral_sub ? <span className="sub">{year.numeral_sub}</span> : null}
          </h2>
          <Towns rows={rows} />
          <p className="summary">{summary}</p>
          <PlaceMap label={year.label} rows={rows} places={places} route={Boolean(year.route)} />
        </div>
      </div>
      <div className="body">
        <div className={year.photo ? "opener has-photo" : "opener"}>
          <div className="intro">
            <h3>{year.heading}</h3>
            <p className="lede">{year.lede}</p>
          </div>
          {year.photo ? <Photo photo={year.photo} root={root} /> : null}
        </div>
        {closing ? (
          <div className="closing">
            {closing.map(([when, what]) => [<p key={`w-${when}`} className="when">{when}</p>, <p key={`t-${when}`} className="what">{what}</p>])}
          </div>
        ) : (
          <table>
            <caption>{`Discourses, ${year.label}, in date order`}</caption>
            <TableHead />
            <tbody><Rows rows={rows} showLang={showLang} {...shared} /></tbody>
          </table>
        )}
        <p className="source">Source: <a href={year.source}>{`Sannyas Wiki, Osho Timeline, ${year.label}`}</a></p>
        {closing ? null : <Key />}
      </div>
    </section>
  );
}
