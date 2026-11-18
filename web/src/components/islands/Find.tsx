// The series search on the home page. It runs in the browser: it reads the rows already
// on the page, filters them by title as the reader types, and jumps to the chosen one.
import { useEffect, useRef, useState } from "react";
import type { MouseEvent, SyntheticEvent } from "react";

type Hit = { id: string; title: string; when: string; key: string };

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** A title as shown, without its language tag. */
function titleText(el: Element | null): string {
  if (!el) return "";
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll(".lang").forEach((n) => n.remove());
  return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Every row of every year on the page that a link can point at. */
function readRows(): Hit[] {
  return [...document.querySelectorAll(".year tbody tr[id]")].map((tr) => {
    const title = titleText(tr.querySelector(".title"));
    const year = tr.closest(".year")?.querySelector("h2 .num")?.textContent;
    return { id: tr.id, title, key: norm(title), when: year + ", " + (tr.querySelector(".dates")?.textContent ?? "").trim() };
  });
}

export function Find() {
  const rows = useRef<Hit[]>([]);
  // Without the script there is nothing to search with, so the form starts hidden.
  const [ready, setReady] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [count, setCount] = useState("");

  useEffect(() => {
    rows.current = readRows();
    setReady(true);
  }, []);

  const search = (value: string) => {
    const q = norm(value);
    if (q.length < 2) {
      setHits([]);
      setCount("");
      return;
    }
    const found = rows.current.filter((r) => r.key.includes(q));
    setCount(found.length ? found.length + " found" + (found.length > 12 ? ", showing the first 12" : "") : "Nothing found");
    setHits(found.slice(0, 12));
  };

  const go = (href: string) => {
    const row = document.getElementById(href.slice(1));
    if (!row) return;
    history.pushState(null, "", href);
    // Jump straight there: a smooth scroll across tens of thousands of pixels is slow and disorienting.
    row.scrollIntoView({ block: "center", behavior: "instant" });
    document.querySelectorAll("tr.found").forEach((r) => r.classList.remove("found"));
    row.classList.add("found");
    setHits([]);
    setCount("");
  };

  const onSubmit = (ev: SyntheticEvent) => {
    ev.preventDefault();
    if (hits[0]) go("#" + hits[0].id);
  };
  const onPick = (ev: MouseEvent<HTMLOListElement>) => {
    const a = (ev.target as Element).closest("a");
    if (!a) return;
    ev.preventDefault();
    go(a.getAttribute("href")!);
  };

  return (
    <form className="find" role="search" hidden={!ready} onSubmit={onSubmit}>
      <label htmlFor="find">Find a series</label>{" "}
      <input id="find" type="search" autoComplete="off" spellCheck={false} placeholder="Beyond Psychology, Geeta-Darshan" aria-controls="find-results" aria-describedby="find-count" onInput={(ev) => search(ev.currentTarget.value)} />
      <p id="find-count" className="find-count" aria-live="polite">{count}</p>
      <ol id="find-results" className="find-results" onClick={onPick}>
        {hits.map((r) => (
          <li key={r.id}><a href={"#" + r.id}><b>{r.title}</b><span>{r.when}</span></a></li>
        ))}
      </ol>
    </form>
  );
}
