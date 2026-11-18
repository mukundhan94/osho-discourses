// The number helpers against values Python prints. Each expected string was produced
// by Python's format() or round(); see the command beside each group.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fixed, general, quotePlus, round } from "./format.ts";

test("fixed() rounds an exact tie to the even digit, as Python does", () => {
  // python3 -c 'print(*[f"{x:.1f}" for x in (0.25, 0.35, 2.5, 100.25, -0.25, -0.0, -0.04, 1e-9)])'
  assert.deepEqual([0.25, 0.35, 2.5, 100.25, -0.25, -0, -0.04, 1e-9].map((x) => fixed(x, 1)),
    ["0.2", "0.3", "2.5", "100.2", "-0.2", "-0.0", "-0.0", "0.0"]);
  // python3 -c 'print(*[f"{x:.2f}" for x in (0.125, 0.375, 1.005, 12.345)], f"{2.5:.0f}", f"{3.5:.0f}")'
  assert.deepEqual([0.125, 0.375, 1.005, 12.345].map((x) => fixed(x, 2)), ["0.12", "0.38", "1.00", "12.35"]);
  assert.deepEqual([fixed(2.5, 0), fixed(3.5, 0)], ["2", "4"]);
});

test("general() prints six significant digits without trailing zeros", () => {
  // python3 -c 'print(*[f"{x:g}" for x in (78.92, -33.39, 0.0, -0.0, 100.0, 0.5, 123.4565, 1234567.0/10, 0.0001)])'
  assert.deepEqual([78.92, -33.39, 0, -0, 100, 0.5, 123.4565, 123456.7, 0.0001].map(general),
    ["78.92", "-33.39", "0", "-0", "100", "0.5", "123.457", "123457", "0.0001"]);
});

test("round() and quotePlus() match Python", () => {
  // python3 -c 'print(round(0.5), round(1.5), round(2.5), round(2.51))'
  assert.deepEqual([0.5, 1.5, 2.5, 2.51].map(round), [0, 2, 2, 3]);
  // python3 -c "import urllib.parse as u; print(u.quote_plus(\"Osho Don't (x)! a*b~c é\"))"
  assert.equal(quotePlus("Osho Don't (x)! a*b~c é"), "Osho+Don%27t+%28x%29%21+a%2Ab~c+%C3%A9");
});
