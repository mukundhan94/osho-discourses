/** A fault in the data files. The message matches the one scripts/build.py stops with. */
export class DataError extends Error {
  override name = "DataError";
}

// What Python calls not printable: controls, format marks, separators other than
// the plain space, and code points that are unassigned, private or lone surrogates.
const UNPRINTABLE = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}]|(?! )\p{Zs}/gu;

/** A string as Python's repr() prints it, for messages that quote a value. */
export function repr(s: string): string {
  const quote = s.includes("'") && !s.includes('"') ? '"' : "'";
  const body = s
    .replaceAll("\\", "\\\\")
    .replaceAll(quote, "\\" + quote)
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t")
    .replace(UNPRINTABLE, (c) => {
      const code = c.codePointAt(0)!;
      const hex = (width: number) => code.toString(16).padStart(width, "0");
      return code < 0x100 ? `\\x${hex(2)}` : code < 0x10000 ? `\\u${hex(4)}` : `\\U${hex(8)}`;
    });
  return quote + body + quote;
}

// The characters Python's str.strip() removes. JavaScript's trim() differs at both
// ends: it keeps U+001C to U+001F and U+0085, and it removes U+FEFF.
const SPACE = "\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const EDGES = new RegExp(`^[${SPACE}]+|[${SPACE}]+$`, "g");

/** A string without the whitespace at its ends, as Python's str.strip() leaves it. */
export function strip(s: string): string {
  return s.replace(EDGES, "");
}

/** A list of strings as Python prints a list. */
export function reprList(items: string[]): string {
  return "[" + items.map(repr).join(", ") + "]";
}

/** Python's ordering of strings, for sorting. The data holds no characters outside the basic plane. */
export function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
