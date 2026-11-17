#!/usr/bin/env bash
# Compare the <body> of a built page with a saved baseline, byte for byte.
#
# Usage: scripts/body_check.sh BASELINE [BUILT]
#   BASELINE  a copy of _site/index.html saved before the change
#   BUILT     the page to check (default: _site/index.html)
#
# Exits 0 and prints "body identical" when everything from <body to </body>
# is the same in both files. Exits 1 and prints the first differences otherwise.
set -euo pipefail

baseline="${1:?usage: scripts/body_check.sh BASELINE [BUILT]}"
built="${2:-_site/index.html}"

body() {
  python3 - "$1" <<'PY'
import sys
data = open(sys.argv[1], "rb").read()
start, end = data.find(b"<body"), data.rfind(b"</body>")
if start < 0 or end < 0:
    sys.exit(f"{sys.argv[1]}: no <body> found")
sys.stdout.buffer.write(data[start:end + len(b"</body>")])
PY
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
body "$baseline" > "$tmp/baseline"
body "$built" > "$tmp/built"

if cmp -s "$tmp/baseline" "$tmp/built"; then
  echo "body identical ($(wc -c < "$tmp/built" | tr -d ' ') bytes)"
else
  echo "body differs: $baseline vs $built"
  diff <(tr '>' '>\n' < "$tmp/baseline") <(tr '>' '>\n' < "$tmp/built") | head -20 || true
  exit 1
fi
