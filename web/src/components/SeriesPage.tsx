import { Fragment } from "react";
import type { Series, Site } from "../data/index.ts";
import { outlineFor } from "../lib/maps.ts";
import { summaryFor } from "../lib/rows.ts";
import { seriesLede, seriesUrl } from "../lib/series.ts";
import { SITE_NAME, yearUrl } from "../lib/site.ts";
import { Footer, Pager, Sprite, YearBand } from "./Chrome.tsx";
import type { Outlines, Step } from "./Chrome.tsx";
import { PlaceMap } from "./PlaceMap.tsx";
import { Row } from "./Row.tsx";
import { Key } from "./Unsure.tsx";
import { TableHead, Towns } from "./YearSection.tsx";

type Props = { site: Site; series: Series; outlines: Outlines };

/** Everything in the body of one series page: every row the series has across the years. */
export function SeriesPage({ site, series: x, outlines }: Props) {
  const rows = x.entries.map((e) => e.row);
  const first = x.entries[0]!;
  const { text: summary, showLang } = summaryFor(rows); // show each row's language only when the series mixes them
  const towns = new Set(rows.flatMap((r) => r.townList));
  const [from, to] = x.span.split(" to ");
  const at = site.series.indexOf(x);
  const step = (s: Series | undefined): Step | undefined => s && { href: "/" + seriesUrl(s), label: s.name, detail: s.span };
  const need = towns.size > 1 ? outlineFor(rows, site.places) : undefined;
  const wiki = x.media["wiki_url"];
  return (
    <>
      <Sprite outlines={outlines} need={need ? [need] : []} />{" "}
      <a className="skip" href="#main">Skip to the series</a>
      <header className="mast sub">
        <h1><a href="/">{SITE_NAME}</a><br /><span>{x.name}</span></h1>
        <div className="intro-side">
          <p>Part of a chronology of every discourse listed on the Sannyas Wiki. <a href={`/${yearUrl(first.year)}#${first.rid}`}>{`See it in ${first.year.label}`}</a>.</p>
        </div>
      </header>
      <YearBand years={site.years} href={(y) => "/" + yearUrl(y)} current={first.year.id} last={<a href="/">All years</a>} />
      <main id="main" className="solo">
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
        <Pager label="Earlier and later series" earlier={step(site.series[at - 1])} later={step(site.series[at + 1])} words={["Earlier series", "Later series"]} />
      </main>
      <Footer />
    </>
  );
}
