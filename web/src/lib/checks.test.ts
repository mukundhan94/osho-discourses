// The checks on the finished site, against build.py's own: on each broken folder or
// picture both must stop, with the same message.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { DataError } from "../data/index.ts";
import { checkOgImage, checkPages } from "./checks.ts";
import { pageLastmod, PAGE_SOURCES, sitemapXml } from "./sitemap.ts";

const REPO = fileURLToPath(new URL("../../../", import.meta.url));
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "osho-checks-"));
after(() => fs.rmSync(scratch, { recursive: true, force: true }));

const fault = (run: () => void): string | undefined => {
  try {
    run();
    return undefined;
  } catch (error) {
    if (error instanceof DataError) return error.message;
    throw error;
  }
};

/** Run a line of Python with build.py loaded; its last line of output, or the message it stopped with. */
function python(code: string, ...args: string[]): string {
  const run = spawnSync("python3", ["-c", `import sys; sys.path.insert(0, sys.argv[1]); import build\n${code}`, path.join(REPO, "scripts"), ...args], { encoding: "utf8" });
  if (run.error) throw run.error;
  return (run.status === 0 ? run.stdout : run.stderr).trim();
}

const page = (title: string, description: string, canonical: string, body = "") =>
  `<html><head>\n<title>${title}</title>\n<meta name="description" content="${description}">\n<link rel="canonical" href="${canonical}">\n</head><body>${body}</body></html>`;

const PAGE_CASES: { name: string; files: Record<string, string>; expect: string | undefined }[] = [
  { name: "a sound pair of pages", files: { "index.html": page("A", "a", "/", '<a href="year/1/">x</a><a href="https://example.org/">y</a><a href="#top">z</a><script src="/_vercel/x.js"></script>'), "year/1/index.html": page("B", "b", "/year/1/", '<a href="/">home</a><img src="/pic.png?v=1">'), "pic.png": "" }, expect: undefined },
  { name: "two pages with one title", files: { "index.html": page("A", "a", "/"), "year/1/index.html": page("A", "b", "/year/1/") }, expect: "year/1/index.html: has the same title as index.html" },
  { name: "two pages with one description", files: { "index.html": page("A", "a", "/"), "year/1/index.html": page("B", "a", "/year/1/") }, expect: "year/1/index.html: has the same description as index.html" },
  { name: "two pages with one canonical address", files: { "index.html": page("A", "a", "/"), "year/1/index.html": page("B", "b", "/") }, expect: "year/1/index.html: has the same canonical as index.html" },
  { name: "a page with no description", files: { "index.html": page("A", "a", "/").replace(/<meta[^>]*>\n/, "") }, expect: "index.html: needs exactly one description, found 0" },
  { name: "a page with an empty title", files: { "index.html": page("", "a", "/") }, expect: "index.html: needs exactly one title, found 1" },
  { name: "a page with two canonical addresses", files: { "index.html": page("A", "a", "/").replace("</head>", '<link rel="canonical" href="/x/">\n</head>') }, expect: "index.html: needs exactly one canonical, found 2" },
  { name: "a link to a page that is not there", files: { "index.html": page("A", "a", "/", '<a href="/year/2/">x</a>') }, expect: "index.html: links to /year/2/, which is not in" },
  { name: "a relative link from a folder to a file that is not there", files: { "index.html": page("A", "a", "/"), "year/1/index.html": page("B", "b", "/year/1/", '<img src="pic.png">') }, expect: "year/1/index.html: links to pic.png, which is not in" },
];

PAGE_CASES.forEach((c, i) => {
  test(`page checks: ${c.name}`, () => {
    const dir = path.join(scratch, `pages-${i}`);
    for (const [name, text] of Object.entries(c.files)) {
      fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      fs.writeFileSync(path.join(dir, name), text);
    }
    const pages = Object.keys(c.files).filter((name) => name.endsWith(".html"));
    const ts = fault(() => checkPages(dir, pages));
    const py = python(
      "import pathlib, json; build.OUT = pathlib.Path(sys.argv[2]); build.check_pages({p: (build.OUT / p).read_text() for p in json.loads(sys.argv[3])}); print('ok')",
      dir, JSON.stringify(pages),
    );
    if (c.expect === undefined) {
      assert.equal(ts, undefined);
      assert.equal(py, "ok");
    } else {
      assert.ok(ts?.startsWith(c.expect), `got: ${ts}`);
      // build.py names its own output folder at the end of this one message.
      assert.equal(ts?.replace("which is not in the built site", "which is not in _site/"), py);
    }
  });
});

const real = fs.readFileSync(path.join(REPO, "assets/og/medallion.png"));
const resized = Buffer.from(real);
resized.writeUInt32BE(1000, 16);
const IMAGE_CASES: { name: string; bytes: Buffer; expect: string | undefined }[] = [
  { name: "the real picture", bytes: real, expect: undefined },
  { name: "a file that is not a PNG", bytes: Buffer.from("GIF89a, not a PNG at all, but long enough to hold a header"), expect: "not a PNG file" },
  { name: "a PNG of the wrong size", bytes: resized, expect: "is 1000x630, must be 1200x630" },
  { name: "a PNG over 300 KB", bytes: Buffer.concat([real, Buffer.alloc(300_001)]), expect: "bytes, must be under 300 KB" },
  { name: "a PNG cut short", bytes: real.subarray(0, real.length - 200), expect: "the PNG is cut short or damaged" },
  { name: "a PNG with one byte of its pixels changed", bytes: (() => { const b = Buffer.from(real); b[b.length >> 1]! ^= 0xff; return b; })(), expect: "the PNG is cut short or damaged" },
];

IMAGE_CASES.forEach((c, i) => {
  test(`share image check: ${c.name}`, () => {
    const file = path.join(scratch, `image-${i}.png`);
    fs.writeFileSync(file, c.bytes);
    const ts = fault(() => checkOgImage(file));
    const py = python("import pathlib; build.check_og_image(pathlib.Path(sys.argv[2])); print('ok')", file);
    if (c.expect === undefined) {
      assert.equal(ts, undefined);
      assert.equal(py, "ok");
    } else {
      assert.ok(ts?.includes(c.expect), `got: ${ts}`);
      assert.equal(ts, py);
    }
  });
});

test("sitemapXml writes what build.py writes", () => {
  const urls = ["https://oshodiscourses.com/", "https://oshodiscourses.com/series/a-b/", "https://example.org/?a=1&b=<2>'\""];
  const py = spawnSync("python3", ["-c", "import sys, json; sys.path.insert(0, sys.argv[1]); import build; sys.stdout.write(build.sitemap_xml(json.loads(sys.argv[2]), '2026-11-17'))", path.join(REPO, "scripts"), JSON.stringify(urls)], { encoding: "utf8" });
  assert.equal(sitemapXml(urls, "2026-11-17"), py.stdout);
});

test("pageLastmod reads the last commit that touched the page sources", () => {
  const expected = execFileSync("git", ["log", "-1", "--format=%cs", "--", ...PAGE_SOURCES], { cwd: REPO, encoding: "utf8" }).trim();
  const shallow = fs.existsSync(path.join(REPO, ".git", "shallow"));
  const found = pageLastmod(REPO);
  assert.equal(found.date, expected);
  if (!shallow) assert.equal(found.source, "last commit touching data, assets, web/src");
});

test("pageLastmod falls back to today's date where there is no git history", () => {
  const dir = path.join(scratch, "no-git");
  fs.mkdirSync(dir);
  const found = pageLastmod(dir);
  assert.match(found.date, /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
  assert.equal(found.source, "build date (git history not available)");
});

test("pageLastmod says so when the date comes from the edge of a shallow clone", () => {
  const dir = path.join(scratch, "shallow");
  execFileSync("git", ["clone", "--quiet", "--depth", "1", "file://" + REPO, dir], { stdio: "ignore" });
  const found = pageLastmod(dir);
  assert.equal(found.source, "oldest commit in a shallow clone (the pages changed on or before this date)");
});
