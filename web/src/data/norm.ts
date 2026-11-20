// A series title reduced to the key used in data/media.csv and data/slugs.csv.
// It must agree with norm() in scripts/wiki_check.py, which the Python data tools use
// to write those keys. Python's \b and \d know about every script, so the patterns
// here spell that out instead of using JavaScript's ASCII-only \b and \d.
export function norm(title: string): string {
  let t = title.toLowerCase();
  t = t.replace(/\((vol\.? *\p{Nd}+)\)/gu, " $1 "); // keep "(Vol 2)", drop other glosses
  t = t.replace(/\([^)]*\)/g, " ");
  t = t.replace(/(?<![\p{L}\p{N}_])0+(\p{Nd})/gu, "$1");
  t = t.replace(/[^a-z0-9]+/g, " ");
  return t.split(" ").filter(Boolean).join(" ");
}
