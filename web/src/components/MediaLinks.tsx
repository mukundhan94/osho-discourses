import type { Link, Media } from "../data/index.ts";
import { mediaFor, norm } from "../data/index.ts";
import { quotePlus } from "../lib/format.ts";

const ICON = { listen: "listen", watch: "watch", read: "list" } as const;

type Props = { title: string; media: Map<string, Media>; links: Map<string, Link[]> };

/** One quiet line of outside links: Listen, Video, Wiki, then any hand-added links. */
export function MediaLinks({ title, media, links }: Props) {
  const m = mediaFor(title, media);
  const key = norm(title);
  let hit: string | undefined;
  for (const k of links.keys()) {
    if ((key === k || key.startsWith(k + " ")) && (hit === undefined || k.length > hit.length)) hit = k;
  }
  const found: { icon: string; label: string; url: string; name: string }[] = [];
  if (m?.["listen_url"]) {
    found.push({ icon: "listen", label: "Listen", url: m["listen_url"], name: `Listen to ${title} on OshoWorld` });
  }
  if (m && Number(m["video"] || 0)) {
    const query = quotePlus("Osho " + m["wiki_title"]!.replace(/\s*\(.*?\)/g, ""));
    found.push({ icon: "watch", label: "Video", url: `https://www.youtube.com/results?search_query=${query}`, name: `Search YouTube for ${title}` });
  }
  if (m?.["wiki_url"]) {
    found.push({ icon: "list", label: "Wiki", url: m["wiki_url"], name: `${title} on the Sannyas Wiki` });
  }
  for (const x of hit === undefined ? [] : links.get(hit)!) {
    found.push({ icon: ICON[x.kind], label: x.label, url: x.url, name: `${x.label}: ${title}` });
  }
  if (!found.length) return null;
  return (
    <span className="media">
      {found.map((f) => (
        <a key={f.url + f.label} href={f.url} rel="noopener" aria-label={f.name}>
          <svg aria-hidden="true"><use href={`#i-${f.icon}`} /></svg>
          {f.label}
        </a>
      ))}
    </span>
  );
}
