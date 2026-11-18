// Numbers written the way Python's format() writes them. scripts/build.py prints map
// coordinates with ":.1f" and outline points with ":g", and the pages must match digit
// for digit. Python rounds an exact tie to the even digit; JavaScript's toFixed() and
// Math.round() round it up.

/** x with `digits` decimal places, as Python's f"{x:.{digits}f}". */
export function fixed(x: number, digits: number): string {
  const negative = x < 0 || Object.is(x, -0);
  // 60 places is more than any number this size holds, so this is its exact value.
  const exact = Math.abs(x).toFixed(60);
  const point = exact.indexOf(".");
  const kept = exact.slice(0, point) + exact.slice(point + 1, point + 1 + digits);
  const rest = exact.slice(point + 1 + digits);
  let n = BigInt(kept);
  const half = "5" + "0".repeat(rest.length - 1);
  if (rest > half || (rest === half && n % 2n === 1n)) n += 1n;
  const text = n.toString().padStart(digits + 1, "0");
  const body = digits ? text.slice(0, -digits) + "." + text.slice(-digits) : text;
  return (negative ? "-" : "") + body;
}

/** x as Python's f"{x:g}": six significant digits, trailing zeros dropped. */
export function general(x: number): string {
  if (x === 0) return Object.is(x, -0) ? "-0" : "0";
  const exponent = Math.floor(Math.log10(Math.abs(x)));
  if (exponent < -4 || exponent >= 6) throw new Error(`general(): ${x} would need an exponent, which no outline point does`);
  const text = fixed(x, Math.max(0, 5 - exponent));
  return text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
}

/** x rounded to a whole number as Python's round(): an exact half goes to the even neighbour. */
export function round(x: number): number {
  return Number(fixed(x, 0));
}

/** Text as Python's urllib.parse.quote_plus() encodes it for a query string. */
export function quotePlus(text: string): string {
  return encodeURIComponent(text)
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replaceAll("%20", "+");
}
