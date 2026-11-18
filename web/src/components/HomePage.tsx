import type { ReactNode } from "react";
import type { Row as RowData, Site } from "../data/index.ts";
import { siteSpan, SITE_NAME, yearUrl } from "../lib/site.ts";
import { Footer, Sprite, YearBand } from "./Chrome.tsx";
import type { Outlines } from "./Chrome.tsx";
import { Row } from "./Row.tsx";
import { YearSection } from "./YearSection.tsx";

// The four cards of the reading tour. `focus` names the part of the example rows a card
// lights up; assets/site.js and the stylesheet both read it.
const TOUR: { focus: string; tone: string; head: string; icon: ReactNode; text: ReactNode[] }[] = [
  {
    focus: "row", tone: "indigo", head: "Each row is a series",
    icon: <path d="M3 6h18M3 12h18M3 18h11" />,
    text: [
      <>When, where, and how many talks. <b>Bold titles</b> are named series, and plain ones are talks named by town.</>,
      <>Some titles are later books that gather talks from several places. Where a year has both Hindi and English, a tag says which.</>,
    ],
  },
  {
    focus: "camp", tone: "leaf", head: "Green means a camp",
    icon: <path d="M12 3l7 9-7 9-7-9z" />,
    text: [<>Green rows are meditation camps, like the first one at Ranakpur in June 1964. On the maps, camps are green diamonds.</>],
  },
  {
    focus: "count", tone: "madder", head: "Counts come from the wiki",
    icon: <><circle cx="12" cy="12" r="8" strokeDasharray="4 3" /><path d="M9 12h6M12 9v6" /></>,
    text: [
      <>14 talks here, <b>15</b> in the whole series. The numbers count rows on the Sannyas Wiki, so they are a guide, not a checked total.</>,
      <>A dashed ring means the wiki is unsure of a date, place or count.</>,
    ],
  },
  {
    focus: "links", tone: "turmeric", head: "Links go elsewhere",
    icon: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
    text: [
      <><b>Listen</b> plays free MP3s on OshoWorld. <b>Video</b> searches YouTube, and <b>Wiki</b> opens the series page.</>,
      <>Official recordings are at <a href="https://www.osho.com/" rel="noopener">osho.com</a>. Nothing is hosted or sold here.</>,
    ],
  },
];

// The three rows of 1964 the tour uses as its example, and the cards that light each up.
const TOUR_ROWS: Record<string, string> = {
  "Mahaveer Ya Mahavinash, 3": "row links",
  "Sadhana Path": "camp count",
  "Talks in Nandurbar": "row",
};

function Tour({ site }: { site: Site }) {
  const sample = site.rowsByYear.get("1964")!.filter((r: RowData) => r.title in TOUR_ROWS);
  return (
    <div className="tour" data-tour="">
      <div className="tour-cards">
        <ol className="tcards" aria-label="Four things to know before reading">
          {TOUR.map((card, i) => (
            <li key={card.focus} className={`tcard t-${card.tone}`} data-focus={card.focus} id={`tour-${i + 1}`}>
              <svg className="ticon" viewBox="0 0 24 24" aria-hidden="true">{card.icon}</svg>
              <h3><span className="tnum" aria-hidden="true">{i + 1}</span><span>{card.head}</span></h3>
              {card.text.map((t, n) => <p key={n}>{t}</p>)}
            </li>
          ))}
        </ol>
        <div className="tnav" hidden>
          <button type="button" className="tback">Back</button>{" "}
          <span className="tdots" aria-hidden="true"><i></i><i></i><i></i><i></i></span>{" "}
          <button type="button" className="tnext">Next</button>
        </div>
      </div>
      <div className="tour-stage body" aria-label="Three example rows from 1964">
        <table>
          <caption>Example rows from 1964</caption>
          <tbody>
            {sample.map((r) => <Row key={r.sort} row={r} tourRow={TOUR_ROWS[r.title]} showLang={false} media={site.media} links={site.links} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Props = { site: Site; outlines: Outlines; seriesUrls: Map<string, string> };

/** Everything in the body of the home page: the masthead, the tour, and all the years. */
export function HomePage({ site, outlines, seriesUrls }: Props) {
  return (
    <>
      <Sprite outlines={outlines} need={["india", "world"]} />{" "}
      <a className="skip" href="#main">Skip to the chronology</a>
      <header className="mast">
        <h1>{SITE_NAME}<br /><span>{siteSpan(site.years)}</span></h1>
        <div className="intro-side">
          <p>{`Every discourse listed on the Sannyas Wiki, in date order: the series, the place and the number of talks. ${site.grand.rows} entries across ${site.grand.towns} places.`}</p>
          <form className="find" role="search" hidden>
            <label htmlFor="find">Find a series</label>{" "}
            <input id="find" type="search" autoComplete="off" spellCheck={false} placeholder="Beyond Psychology, Geeta-Darshan" aria-controls="find-results" aria-describedby="find-count" />
            <p id="find-count" className="find-count" aria-live="polite"></p>
            <ol id="find-results" className="find-results"></ol>
          </form>
        </div>
      </header>
      <YearBand years={site.years} href={(y) => `#y-${y.id}`} last={<a href="#sources">Sources</a>} />
      <main id="main">
        <section className="reading" aria-labelledby="h-reading">
          <h2 id="h-reading" className="vh">How to read this page</h2>
          <p className="lead">{"A free, non-commercial library of when and where Osho spoke. "}<small>Nothing here is for sale. Recordings are linked, never stored here.</small></p>
          <Tour site={site} />
        </section>
        {site.years.map((year) => (
          <YearSection key={year.id} year={year} rows={site.rowsByYear.get(year.id)!} places={site.places} root="" yearHref={"/" + yearUrl(year)} media={site.media} links={site.links} seriesUrls={seriesUrls} />
        ))}
      </main>
      <Footer />
    </>
  );
}
