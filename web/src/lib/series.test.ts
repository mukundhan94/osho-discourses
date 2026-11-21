import assert from "node:assert/strict";
import { test } from "node:test";
import { seriesStart } from "./series.ts";

test("seriesStart keeps only as much of a sort key as is a real date", () => {
  assert.deepEqual(
    ["1974-03-21", "1966-01-00", "1967-00", "1967-00-00", "1964-04-24a", "1972-02-30", "1972-02-29", "1971-02-29", "1970-13-01", "0000-01-01"].map(seriesStart),
    ["1974-03-21", "1966-01", "1967", "1967", "1964-04-24", "", "1972-02-29", "", "", ""],
  );
});
