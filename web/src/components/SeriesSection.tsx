import { Fragment } from "react";
import type { Series, Site } from "../data/index.ts";
import { summaryFor } from "../lib/rows.ts";
import { seriesLede } from "../lib/series.ts";
import { yearUrl } from "../lib/site.ts";
import { PlaceMap } from "./PlaceMap.tsx";
import { Row } from "./Row.tsx";
import { Key } from "./Unsure.tsx";
import { TableHead, Towns } from "./YearSection.tsx";

/** One series: every row it has across the years, under a heading for each year. */
export function SeriesSection({ site, series: x }: { site: Site; series: Series }) {
  const rows = x.entries.map((e) => e.row);
  const { text: summary, showLang } = summaryFor(rows); // show each row's language only when the series mixes them
  const towns = new Set(rows.flatMap((r) => r.townList));
  const [from, to] = x.span.split(" to ");
  const wiki = x.media["wiki_url"];
  return (
    <section className="year arrived series" aria-labelledby="h-series">
      <div className="rail">
        <span className="stud" aria-hidden="true"></span>
        <div className="rail-in">
          <h2 id="h-when">
            <span className="num">{from}</span>
            {to ? <span className="sub">{`to ${to}`}</span> : null}
          </h2>
          <Towns rows={rows} />
          <p className="summary">{summary}</p>
          {towns.size > 1 ? <PlaceMap label={x.span} rows={rows} places={site.places} /> : null}
        </div>
      </div>
      <div className="body">
        <div className="opener">
          <div className="intro">
            <h3 id="h-series">{x.name}</h3>
            <p className="lede">{seriesLede(x)}</p>
          </div>
        </div>
        <table>
          <caption>{`${x.name}, in date order`}</caption>
          <TableHead />
          <tbody>
            {x.years.map((year) => {
              // One heading per year, then that year's rows; a repeated place is marked within a year only.
              const mine = x.entries.filter((e) => e.year === year);
              return (
                <Fragment key={year.id}>
                  <tr className="month">
                    <th colSpan={4} scope="rowgroup"><a href={`/${yearUrl(year)}#${mine[0]!.rid}`}>{year.label}</a></th>
                  </tr>
                  {mine.map((e, i) => (
                    <Row key={e.rid} row={e.row} rid={e.rid} showLang={showLang} samePlace={i > 0 && e.row.place === mine[i - 1]!.row.place} media={site.media} links={site.links} />
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {wiki ? <p className="source">Source: <a href={wiki}>{`Sannyas Wiki, ${x.name}`}</a></p> : null}
        <Key />
      </div>
    </section>
  );
}
