/** A fault in the data files. The message matches the one scripts/build.py stops with. */
export class DataError extends Error {
  override name = "DataError";
}

/** A string as Python's repr() prints it, for messages that quote a value. */
export function repr(s: string): string {
  const quote = s.includes("'") && !s.includes('"') ? '"' : "'";
  const body = s
    .replaceAll("\\", "\\\\")
    .replaceAll(quote, "\\" + quote)
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t");
  return quote + body + quote;
}

/** A list of strings as Python prints a list. */
export function reprList(items: string[]): string {
  return "[" + items.map(repr).join(", ") + "]";
}

/** Python's ordering of strings, for sorting. The data holds no characters outside the basic plane. */
export function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
