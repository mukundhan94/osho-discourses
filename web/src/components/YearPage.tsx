import type { Site, Year } from "../data/index.ts";
import { outlineFor } from "../lib/maps.ts";
import { SITE_NAME, yearUrl } from "../lib/site.ts";
import { Footer, Pager, Sprite, YearBand } from "./Chrome.tsx";
import type { Outlines, Step } from "./Chrome.tsx";
import { YearSection } from "./YearSection.tsx";

type Props = { site: Site; year: Year; outlines: Outlines; seriesUrls: Map<string, string> };

/** Everything in the body of one year's own page. */
export function YearPage({ site, year, outlines, seriesUrls }: Props) {
  const rows = site.rowsByYear.get(year.id)!;
  const at = site.years.indexOf(year);
  const step = (y: Year | undefined): Step | undefined =>
    y && { href: "/" + yearUrl(y), label: y.label, detail: y.heading };
  const need = outlineFor(rows, site.places);
  return (
    <>
      <Sprite outlines={outlines} need={need ? [need] : []} />{" "}
      <a className="skip" href="#main">Skip to the year</a>
      <header className="mast sub">
        <h1><a href="/">{SITE_NAME}</a><br /><span>{year.label}</span></h1>
        <div className="intro-side">
          <p>Part of a chronology of every discourse listed on the Sannyas Wiki. <a href={`/#y-${year.id}`}>{`See it among all ${site.years.length} years`}</a>.</p>
        </div>
      </header>
      <YearBand years={site.years} href={(y) => "/" + yearUrl(y)} current={year.id} last={<a href="/">All years</a>} />
      <main id="main" className="solo">
        <YearSection year={year} rows={rows} places={site.places} root="/" arrived media={site.media} links={site.links} seriesUrls={seriesUrls} />
        <Pager label="Earlier and later years" earlier={step(site.years[at - 1])} later={step(site.years[at + 1])} words={["Earlier", "Later"]} />
      </main>
      <Footer />
    </>
  );
}
