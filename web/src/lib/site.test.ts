import assert from "node:assert/strict";
import { test } from "node:test";
import type { Year } from "../data/index.ts";
import { clip, homeLd } from "./site.ts";

const year = (numeral: string) => ({ numeral }) as Year;

test("homeLd stops unless the first and last numerals are years in order", () => {
  // The message is build.py's, from json_ld().
  assert.throws(() => homeLd([year("1990"), year("1954")]), {
    message: "years.json: the first and last numerals must be years in order, got '1990' and '1954'",
  });
  assert.throws(() => homeLd([year("1954"), year("90")]), { name: "DataError" });
  assert.doesNotThrow(() => homeLd([year("1954"), year("1990")]));
});

test("clip shortens to whole words and marks the cut", () => {
  // python3 -c 'import sys; sys.path.insert(0,"scripts"); import build; print(build.clip("one two, three four", 12), build.clip("short", 12))'
  assert.equal(clip("one two, three four", 12), "one two…");
  assert.equal(clip("short", 12), "short");
});
