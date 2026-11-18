// The four-card reading tour on the home page. Without the script all four cards show.
// In the browser it shows one card at a time and lights up the part of the example
// rows that card describes.
import { useEffect, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { Link, Media, Row as RowData } from "../../data/index.ts";
import { Row } from "../Row.tsx";

// `focus` names the part of the example rows a card lights up; the stylesheet reads it.
const CARDS: { focus: string; tone: string; head: string; icon: ReactNode; text: ReactNode[] }[] = [
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

export type TourProps = {
  /** The example rows, each with the cards that light it up, such as "camp count". */
  rows: { row: RowData; lights: string }[];
  /** Only the media.csv lines and hand-added links these rows match. */
  media: Map<string, Media>;
  links: Map<string, Link[]>;
};

export function Tour({ rows, media, links }: TourProps) {
  // `at` is undefined until the script runs: every card shows and there are no controls.
  const [at, setAt] = useState<number>();
  useEffect(() => setAt(0), []);
  const end = CARDS.length - 1;

  const onKey = (ev: KeyboardEvent) => {
    if (at === undefined) return;
    if (ev.key === "ArrowRight" && at < end) {
      setAt(at + 1);
      ev.preventDefault();
    }
    if (ev.key === "ArrowLeft" && at > 0) {
      setAt(at - 1);
      ev.preventDefault();
    }
  };

  return (
    <div className={at === undefined ? "tour" : "tour js"} data-tour="" data-step={at === undefined ? undefined : CARDS[at]!.focus} onKeyDown={onKey}>
      <div className="tour-cards">
        <ol className="tcards" aria-label="Four things to know before reading">
          {CARDS.map((card, i) => (
            <li key={card.focus} className={`tcard t-${card.tone}` + (i === at ? " active" : "")} data-focus={card.focus} id={`tour-${i + 1}`}>
              <svg className="ticon" viewBox="0 0 24 24" aria-hidden="true">{card.icon}</svg>
              <h3><span className="tnum" aria-hidden="true">{i + 1}</span><span>{card.head}</span></h3>
              {card.text.map((t, n) => <p key={n}>{t}</p>)}
            </li>
          ))}
        </ol>
        <div className="tnav" hidden={at === undefined}>
          <button type="button" className="tback" disabled={at === 0} onClick={() => at !== undefined && at > 0 && setAt(at - 1)}>Back</button>{" "}
          <span className="tdots" aria-hidden="true">{CARDS.map((card, i) => <i key={card.focus} className={i === at ? "on" : undefined}></i>)}</span>{" "}
          <button
            type="button"
            className="tnext"
            aria-label={at === undefined ? undefined : at === end ? "Start the tour again" : `Next card, ${at + 2} of ${CARDS.length}`}
            onClick={() => at !== undefined && setAt(at === end ? 0 : at + 1)}
          >
            {at === end ? "Start again" : "Next"}
          </button>
        </div>
      </div>
      <div className="tour-stage body" aria-label="Three example rows from 1964">
        <table>
          <caption>Example rows from 1964</caption>
          <tbody>
            {rows.map(({ row, lights }) => <Row key={row.sort} row={row} tourRow={lights} showLang={false} media={media} links={links} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
