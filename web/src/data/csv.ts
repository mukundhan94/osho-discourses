// Reads CSV the way Python's csv module does with its default settings, which is
// what scripts/build.py uses: commas, double quotes, a doubled quote for a literal
// quote, and blank lines skipped. A quote inside an unquoted field is an ordinary
// character.
import fs from "node:fs";

export function parseCsv(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let state: "start" | "plain" | "quoted" | "quote-in-quoted" = "start";
  let started = false; // the current record has at least one field or character

  const endField = () => {
    record.push(field);
    field = "";
    state = "start";
  };
  const endRecord = () => {
    if (started) {
      endField();
      records.push(record);
    }
    record = [];
    started = false;
    state = "start";
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (state === "quoted") {
      if (c === '"') state = "quote-in-quoted";
      else field += c;
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRecord();
    } else if (c === ",") {
      started = true;
      endField();
    } else if (c === '"' && state === "start") {
      started = true;
      state = "quoted";
    } else if (c === '"' && state === "quote-in-quoted") {
      field += '"';
      state = "quoted";
    } else {
      started = true;
      field += c;
      state = "plain";
    }
  }
  endRecord();
  return records;
}

export type Table = {
  /** The first line's fields, or undefined when the file has no lines. */
  header: string[] | undefined;
  /** Every later non-blank line, as fields. Line n of the list is file row n + 2. */
  rows: string[][];
};

export function readTable(path: string): Table {
  const [header, ...rows] = parseCsv(fs.readFileSync(path, "utf8"));
  return { header, rows };
}

/** Rows as objects keyed by the header. A short row leaves its last columns empty. */
export function records(table: Table): Record<string, string>[] {
  const header = table.header ?? [];
  return table.rows.map((row) => Object.fromEntries(header.map((name, i) => [name, row[i] ?? ""])));
}
