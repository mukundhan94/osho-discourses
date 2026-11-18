// The row of year pills. This runs in the browser as well as at build time.
//
// On the home page (`track`) it follows the reader: the year being read is marked and
// centred, each year's rail stud is inked in as the year arrives, and the right edge
// fades while more years are off-screen. On a year or series page it centres the
// current year once.
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type BandItem = { id: string; href: string; label: string; nav: string };

type Props = {
  items: BandItem[];
  /** The id of the year a page is about, marked as the current page. */
  current?: string;
  /** The link after the last year. */
  last: { href: string; label: string };
  /** Follow the reader down the page. Set on the home page, where each link points at a section. */
  track?: boolean;
};

export function YearBand({ items, current, last, track = false }: Props) {
  const nav = useRef<HTMLElement>(null);
  const [reading, setReading] = useState<string>(); // the href of the section being read
  const [more, setMore] = useState(false);

  // A year or series page: bring the current year to the middle of the band.
  useEffect(() => {
    if (track) return;
    const here = nav.current?.querySelector<HTMLElement>("[aria-current]");
    const band = nav.current;
    if (here && band) band.scrollLeft = here.offsetLeft - (band.clientWidth - here.offsetWidth) / 2;
  }, [track]);

  // The home page: mark and centre the section at the reading line.
  useEffect(() => {
    const band = nav.current;
    if (!track || !band) return;
    const links = [...band.querySelectorAll("a")];
    const targets = links
      .map((a) => document.getElementById(a.getAttribute("href")!.slice(1)))
      .filter((t): t is HTMLElement => t !== null);
    if (!targets.length || !("IntersectionObserver" in window)) return;

    const setCurrent = (id: string) => {
      setReading("#" + id);
      const a = links.find((link) => link.getAttribute("href") === "#" + id);
      if (a) band.scrollTo({ left: Math.max(0, a.offsetLeft - (band.clientWidth - a.offsetWidth) / 2), behavior: "auto" });
    };
    const atEnd = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const visible = new Map<string, boolean>();
    let lastIsCurrent = false;
    const refresh = () => {
      const end = targets.at(-1)!;
      if (atEnd()) {
        lastIsCurrent = true;
        setCurrent(end.id);
        return;
      }
      const now = targets.filter((t) => visible.get(t.id)).at(-1);
      lastIsCurrent = now === end;
      if (now) setCurrent(now.id);
      else setReading(undefined);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(entry.target.id, entry.isIntersecting);
          if (entry.isIntersecting) entry.target.classList.add("arrived");
        }
        refresh();
      },
      { rootMargin: "-25% 0px -60% 0px" },
    );
    targets.forEach((t) => observer.observe(t));

    // Fade the band's right edge while more years are off-screen to the right.
    const edge = () => setMore(band.scrollLeft + band.clientWidth < band.scrollWidth - 8);
    band.addEventListener("scroll", edge, { passive: true });
    window.addEventListener("resize", edge);
    edge();

    // The footer is too short to reach the reading line, so it is marked at the page end.
    const onScroll = () => {
      if (atEnd() || lastIsCurrent) refresh();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      band.removeEventListener("scroll", edge);
      window.removeEventListener("resize", edge);
      window.removeEventListener("scroll", onScroll);
    };
  }, [track]);

  const marked = (href: string, id?: string) => (reading === href ? "true" : id !== undefined && id === current ? "page" : undefined);
  const out: ReactNode[] = [];
  let decade: string | undefined;
  items.forEach((y, i) => {
    const d = /^[0-9]+$/.test(y.id) ? y.id.slice(0, 3) : undefined;
    if (d && ((decade !== undefined && d !== decade) || (decade === undefined && i > 0))) {
      out.push(<span key={`d-${d}`} className="decade" aria-hidden="true">{`${d[2]}0s`}</span>);
    }
    decade = d ?? decade;
    out.push(<a key={y.id} href={y.href} aria-label={y.label} aria-current={marked(y.href, y.id)}>{y.nav}</a>);
  });
  return (
    <nav ref={nav} className={more ? "years more" : "years"} aria-label="Years">
      {out}
      <a href={last.href} aria-current={marked(last.href)}>{last.label}</a>
    </nav>
  );
}
