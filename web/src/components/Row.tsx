import type { Link, Media, Row as RowData } from "../data/index.ts";
import { mediaFor } from "../data/index.ts";
import { strip } from "../data/errors.ts";
import { round } from "../lib/format.ts";
import { KIND_LABEL, LANG_NAME, talkNumber, unitFor } from "../lib/rows.ts";
import { MediaLinks } from "./MediaLinks.tsx";
import { Unsure } from "./Unsure.tsx";

export type RowProps = {
  row: RowData;
  /** The id the row carries on the page, so a link can point at it. */
  rid: string;
  /** Show the row's language. Set only where a table mixes languages. */
  showLang: boolean;
  /** The place repeats the row above, so it is shown as a ditto mark. */
  samePlace?: boolean;
  media: Map<string, Media>;
  links: Map<string, Link[]>;
  /** Series key to page address. Given, the title links to its series page. */
  seriesUrls?: Map<string, string>;
};

/** The wiki's length of the whole series, when it is longer than this row. */
function SeriesSize({ title, media, rowTalks }: { title: string; media: Map<string, Media>; rowTalks: number | undefined }) {
  const m = mediaFor(title, media);
  if (!m) return null;
  const talks = Number(m["talks"] || 0);
  if (talks <= (rowTalks || 0) || talks < 2) return null;
  const hours = round(Number(m["minutes"] || 0) / 60);
  return (
    <span className="series-size" title={`The wiki lists ${talks} talks in the whole series`}>
      {`of ${talks}` + (hours ? ` \u00b7 ${hours}\u00a0h` : "")}
    </span>
  );
}

/** One line of a year's table: dates, title with its note and links, place, talks. */
export function Row({ row: r, rid, showLang, samePlace = false, media, links, seriesUrls }: RowProps) {
  let note = strip(r.note);
  const label = KIND_LABEL[r.kind];
  // Say what kind of row it is, unless its own words already do.
  if (label && !(r.title + " " + note).toLowerCase().includes(label.split(/\s+/).at(-1)!.toLowerCase().replace(/s+$/, ""))) {
    note = note ? `${label}. ${note}` : label;
  }
  // The last word stays with the one before it when it is a part number, so "Vol 2" never splits.
  const words = r.title.split(" ");
  const tail = words.length > 2 && /^[\p{Nd},]+$/u.test(words.at(-1)!) ? 2 : 1;
  const head = words.slice(0, -tail).join(" ");
  const last = words.slice(-tail).join("\u00a0");
  const title = (
    <>
      {head ? head + " " : ""}
      <span className="keep">
        {showLang && r.lang ? last + " " : last}
        {showLang && r.lang ? <span className="lang" data-l={r.lang}>{LANG_NAME[r.lang]}</span> : null}
      </span>
    </>
  );
  const found = seriesUrls ? mediaFor(r.title, media) : undefined;
  const href = found ? seriesUrls!.get(found["key"]!) : undefined;
  return (
    <tr className={r.kind} id={rid}>
      <td className="dates">{r.dates}{r.unsure ? <Unsure /> : null}</td>
      <td className="what">
        <span className="title">{href ? <a href={href}>{title}</a> : title}</span>
        {note ? <span className="note">{note}</span> : null}
        <span className="place-inline">{r.place}</span>
        <MediaLinks title={r.title} media={media} links={links} />
      </td>
      {samePlace ? (
        <td className="place same">
          <span className="vh">{r.place}</span>
          <span aria-hidden="true" title="Same place as above">{"\u3003"}</span>
        </td>
      ) : (
        <td className="place">{r.place}</td>
      )}
      <td className="talks">
        <span className="n" data-unit={unitFor(r.talks)}>{r.talks}</span>
        <SeriesSize title={r.title} media={media} rowTalks={talkNumber(r.talks)} />
      </td>
    </tr>
  );
}
