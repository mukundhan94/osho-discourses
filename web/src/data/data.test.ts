// Tests of the loader: the real data loads, each broken copy of the data stops it with
// the fault it should, and each odd but valid copy still loads. Run with `npm test` in web/.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./csv.ts";
import { DataError, loadSite } from "./index.ts";
import { checkPhoto, loadMedia, loadPlaces, loadRows, loadYears } from "./load.ts";
import { addSlugs, collectSeries } from "./series.ts";
import { norm } from "./norm.ts";

const REPO = fileURLToPath(new URL("../../../", import.meta.url));

type Edit =
  | { file: string; find: string; replace: string }
  | { file: string; append: string }
  | { file: string; keepLines: number }
  | { file: string; crlf: true }
  | { file: string; chomp: true };
type Cases = {
  broken: { name: string; edits: Edit[]; message: string }[];
  valid: { name: string; edits: Edit[] }[];
};
const cases: Cases = JSON.parse(fs.readFileSync(path.join(REPO, "web/tests/fixtures/data-cases.json"), "utf8"));

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "osho-data-"));
after(() => fs.rmSync(scratch, { recursive: true, force: true }));

/** A copy of data/ with the edits applied, beside a link to the real assets/. */
function copyWith(edits: Edit[], n: number): string {
  const root = path.join(scratch, String(n));
  fs.cpSync(path.join(REPO, "data"), path.join(root, "data"), { recursive: true });
  fs.symlinkSync(path.join(REPO, "assets"), path.join(root, "assets"));
  for (const edit of edits) {
    const file = path.join(root, "data", edit.file);
    let text = fs.readFileSync(file, "utf8");
    if ("find" in edit) {
      assert.ok(text.includes(edit.find), `${edit.file} no longer contains ${JSON.stringify(edit.find)}`);
      text = text.replace(edit.find, () => edit.replace);
    } else if ("append" in edit) {
      text += edit.append + "\n";
    } else if ("keepLines" in edit) {
      text = text.split("\n").slice(0, edit.keepLines).join("\n") + "\n";
    } else if ("crlf" in edit) {
      text = text.replaceAll("\n", "\r\n");
    } else {
      text = text.replace(/\n$/, "");
    }
    fs.writeFileSync(file, text);
  }
  return root;
}

/** The message the loader stops with on a folder, or undefined when it loads. Anything but a DataError is a bug here. */
function fault(root: string): string | undefined {
  try {
    loadSite(root);
    return undefined;
  } catch (error) {
    if (error instanceof DataError) return error.message;
    throw error;
  }
}

/** The key of every series in a folder's data, found the way the build finds them, before slugs.csv is read. */
function loadKeys(root: string): string[] {
  const places = loadPlaces(root);
  const years = loadYears(root);
  years.forEach((y) => checkPhoto(root, y));
  const rowsByYear = new Map(years.map((y) => [y.id, loadRows(root, y.id, places)]));
  return collectSeries(years, rowsByYear, loadMedia(root)).map((x) => x.key);
}

test("the real data loads, with the totals the site states", () => {
  const site = loadSite(REPO);
  assert.equal(site.years.length, 28);
  assert.equal(site.series.length, 546);
  assert.deepEqual(site.grand, { rows: 839, towns: 125 });
  // Every series has an address, and no two share one.
  assert.equal(new Set(site.series.map((x) => x.slug)).size, site.series.length);
});

cases.valid.forEach((c, i) => {
  test(`loads with ${c.name}`, () => {
    assert.equal(fault(copyWith(c.edits, i)), undefined);
  });
});

cases.broken.forEach((c, i) => {
  test(`stops on ${c.name}`, () => {
    assert.equal(fault(copyWith(c.edits, 100 + i)), c.message);
  });
});

test("stops on a year with no heading", () => {
  const root = copyWith([{ file: "years.json", find: '"heading": "The first camp at Ranakpur",', replace: "" }], 200);
  assert.equal(fault(root), "years.json: 1964: heading is required");
});

test("stops on a media.csv count that is not a whole number", () => {
  const root = copyWith([{ file: "media.csv", find: ",29,1,0,,", replace: ",29,1.5,0,," }], 201);
  assert.equal(fault(root), "media.csv:3: video must be a whole number or empty, not '1.5'");
});

// `make slugs` writes data/slugs.csv, the one data file the code writes. An address is
// permanent once published, so these pin what the writer may and may not do.
const ROSE = "a rose is a rose is a rose,a-rose-is-a-rose-is-a-rose\n";
const slugsFile = (root: string) => path.join(root, "data", "slugs.csv");

test("make slugs adds a missing series and leaves every other row as it was", () => {
  const root = copyWith(
    [
      { file: "slugs.csv", find: ROSE, replace: "" },
      { file: "slugs.csv", find: "a new vision of women s liberation,a-new-vision-of-women-s-liberation", replace: "a new vision of women s liberation,an-address-chosen-by-hand" },
    ],
    300,
  );
  const before = fs.readFileSync(slugsFile(root), "utf8").split("\n");
  assert.equal(addSlugs(root, loadKeys(root)), 1);
  const after = fs.readFileSync(slugsFile(root), "utf8").split("\n");
  assert.ok(after.includes(ROSE.trim()), "the missing series has its address");
  assert.ok(after.includes("a new vision of women s liberation,an-address-chosen-by-hand"), "a hand-chosen address is kept");
  assert.deepEqual(after.filter((line) => line !== ROSE.trim()), before, "no other row moved or changed");
  assert.equal(fault(root), undefined);
});

test("make slugs changes nothing when every series has an address", () => {
  const root = copyWith([], 301);
  const written = fs.statSync(slugsFile(root)).mtimeMs;
  assert.equal(addSlugs(root, loadKeys(root)), 0);
  assert.equal(fs.statSync(slugsFile(root)).mtimeMs, written);
  assert.equal(fs.existsSync(slugsFile(root) + ".new"), false);
});

test("make slugs refuses an address that is already taken, and leaves the file alone", () => {
  const root = copyWith(
    [
      { file: "slugs.csv", find: ROSE, replace: "" },
      { file: "slugs.csv", find: "a new vision of women s liberation,a-new-vision-of-women-s-liberation", replace: "a new vision of women s liberation,a-rose-is-a-rose-is-a-rose" },
    ],
    302,
  );
  const before = fs.readFileSync(slugsFile(root), "utf8");
  assert.throws(() => addSlugs(root, loadKeys(root)), {
    name: "DataError",
    message: "slugs.csv: 'a rose is a rose is a rose' would repeat or empty the slug 'a-rose-is-a-rose-is-a-rose'; add its row by hand",
  });
  assert.equal(fs.readFileSync(slugsFile(root), "utf8"), before);
  assert.equal(fs.existsSync(slugsFile(root) + ".new"), false);
});

test("make slugs stops on a row whose series is gone, without writing", () => {
  const root = copyWith([{ file: "slugs.csv", find: ROSE, replace: "" }, { file: "slugs.csv", append: "not a series,not-a-series" }], 303);
  const before = fs.readFileSync(slugsFile(root), "utf8");
  assert.throws(() => addSlugs(root, loadKeys(root)), { name: "DataError", message: /^slugs\.csv: 'not a series' is no longer a series\./ });
  assert.equal(fs.readFileSync(slugsFile(root), "utf8"), before);
});

test("the CSV reader handles quotes, doubled quotes and blank lines", () => {
  assert.deepStrictEqual(parseCsv('a,"b,c","d ""e"""\n'), [["a", "b,c", 'd "e"']]);
  assert.deepStrictEqual(parseCsv('x,5" tall,\n\n,\n'), [["x", '5" tall', ""], ["", ""]]);
  assert.deepStrictEqual(parseCsv('"a"b,c'), [["ab", "c"]]);
  assert.deepStrictEqual(parseCsv(""), []);
});

test("norm drops glosses, keeps volume numbers and strips leading zeros", () => {
  assert.equal(norm("Yoga: The Alpha and Omega, Vol 01"), "yoga the alpha and omega vol 1");
  assert.equal(norm("Sadhana Path (साधना पथ)"), "sadhana path");
  assert.equal(norm("The Book (Vol 2)"), "the book vol 2");
});
