// Proves the TypeScript loader against scripts/build.py's loader:
//   - on the real data, both load the same values;
//   - on each broken copy of the data, both stop with the same message.
// The Python side is scripts/data_dump.py. Run with `npm test` in web/.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./csv.ts";
import { dump } from "./dump.ts";
import { DataError, loadSite } from "./index.ts";
import { norm } from "./norm.ts";

const REPO = fileURLToPath(new URL("../../../", import.meta.url));

type Edit =
  | { file: string; find: string; replace: string }
  | { file: string; append: string }
  | { file: string; keepLines: number }
  | { file: string; crlf: true }
  | { file: string; chomp: true };
type Cases = {
  broken: { name: string; edits: Edit[]; expect: string }[];
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

/** What build.py's loader makes of a folder: the data it loaded, or the message it stopped with. */
function python(root: string): { data?: unknown; fault?: string } {
  const run = spawnSync("python3", [path.join(REPO, "scripts/data_dump.py"), root], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (run.error) throw run.error;
  return run.status === 0 ? { data: JSON.parse(run.stdout) } : { fault: run.stderr.trim() };
}

/** The same for the TypeScript loader. Only a DataError counts as a fault; anything else is a bug here. */
function typescript(root: string): { data?: unknown; fault?: string } {
  try {
    return { data: JSON.parse(JSON.stringify(dump(loadSite(root)))) };
  } catch (error) {
    if (error instanceof DataError) return { fault: error.message };
    throw error;
  }
}

test("the real data loads to the same values as build.py", () => {
  const py = python(REPO);
  assert.equal(py.fault, undefined);
  const ts = typescript(REPO);
  assert.equal(ts.fault, undefined);
  assert.deepStrictEqual(ts.data, py.data);
  const site = loadSite(REPO);
  assert.equal(site.years.length, 28);
  assert.ok(site.series.length > 500);
});

cases.valid.forEach((c, i) => {
  test(`loads the same with ${c.name}`, () => {
    const root = copyWith(c.edits, i);
    const py = python(root);
    assert.equal(py.fault, undefined);
    assert.deepStrictEqual(typescript(root).data, py.data);
  });
});

cases.broken.forEach((c, i) => {
  test(`stops on ${c.name}`, () => {
    const root = copyWith(c.edits, 100 + i);
    const py = python(root);
    assert.ok(py.fault?.includes(c.expect), `build.py said: ${py.fault ?? "nothing, it loaded"}`);
    assert.equal(typescript(root).fault, py.fault);
  });
});

// Faults build.py has no message for: it stops on a Python traceback, or only when a
// page happens to use the value. The TypeScript loader names them.
test("stops on a year with no heading", () => {
  const root = copyWith([{ file: "years.json", find: '"heading": "The first camp at Ranakpur",', replace: "" }], 200);
  assert.equal(typescript(root).fault, "years.json: 1964: heading is required");
});

test("stops on a media.csv count that is not a whole number", () => {
  const root = copyWith([{ file: "media.csv", find: ",29,1,0,,", replace: ",29,1.5,0,," }], 201);
  assert.equal(typescript(root).fault, "media.csv:3: video must be a whole number or empty, not '1.5'");
});

test("the CSV reader treats quotes as Python's csv module does", () => {
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
