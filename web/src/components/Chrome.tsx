// The parts every page has around its content that never change in the browser: the
// shared shapes, the earlier and later links, and the footer.
import { REPO, SOURCES } from "../lib/site.ts";

export type Outlines = { india: string; world: string };

/** Shared shapes: the map outlines a page uses, and the link icons. */
export function Sprite({ outlines, need }: { outlines: Outlines; need: (keyof Outlines)[] }) {
  return (
    <svg className="sprite" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>{need.map((n) => <path key={n} id={`o-${n}`} d={outlines[n]} />)}</defs>
      <symbol id="i-listen" viewBox="0 0 16 16"><path d="M8 1a6 6 0 0 0-6 6v5a2 2 0 0 0 2 2h1V8H3.5V7a4.5 4.5 0 0 1 9 0v1H11v6h1a2 2 0 0 0 2-2V7a6 6 0 0 0-6-6z" /></symbol>
      <symbol id="i-watch" viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" /></symbol>
      <symbol id="i-list" viewBox="0 0 16 16"><path d="M2 3h12v2H2zm0 4h12v2H2zm0 4h8v2H2z" /></symbol>
    </svg>
  );
}

export type Step = { href: string; label: string; detail: string };

/** The earlier and later links at the foot of a page. A side with nothing to lead to stays empty. */
export function Pager({ label, earlier, later, words }: { label: string; earlier?: Step; later?: Step; words: [string, string] }) {
  const side = (step: Step | undefined, rel: "prev" | "next", word: string) =>
    step ? (
      <a rel={rel} href={step.href}><small>{word}</small><b>{step.label}</b><span>{step.detail}</span></a>
    ) : (
      <span></span>
    );
  return (
    <nav className="pager" aria-label={label}>
      {side(earlier, "prev", words[0])}{" "}{side(later, "next", words[1])}
    </nav>
  );
}

export function Footer() {
  return (
    <footer id="sources">
      <h2>Sources</h2>
      <div className="cols">
        <div>
          <ul className="links">{SOURCES.map(([title, url]) => <li key={url}><a href={url}>{title}</a></li>)}</ul>
        </div>
        <div>
          <p>Compiled in November 2026. Each year links to its wiki page under its table. The wiki is the authority for every row. Where this page and the wiki differ, the wiki is right and this page needs correcting.</p>
          <p>The site is open source. <a href={REPO}>See the code and data on GitHub</a>, <a href={`${REPO}/issues/new/choose`}>suggest a correction or a link</a>, or read <a href={`${REPO}/blob/main/CONTRIBUTING.md`}>how to contribute</a>.</p>
          <p>Visits are counted with Vercel Web Analytics, which records anonymous page views without third-party cookies. Vercel Speed Insights measures how fast the page loads.</p>
          <p>Map outlines are from Natural Earth (public domain). Positions are approximate. Photographs are credited beside each one. All are recent and reused under Creative Commons licences, except the 1983 photograph of Rajneeshpuram, which its photographer releases for any use with attribution. Type is Yatra One and Hind, both under the SIL Open Font License.</p>
        </div>
      </div>
    </footer>
  );
}
