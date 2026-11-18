/** The ring that marks a date, place or count the source is unsure of. */
export function Unsure() {
  return (
    <svg className="unsure" viewBox="0 0 16 16" role="img" aria-label="Marked uncertain in the source">
      <title>Marked uncertain in the source</title>
      <circle cx="8" cy="8" r="6" />
    </svg>
  );
}

/** The line under a table that explains its marks. */
export function Key() {
  return (
    <p className="key">
      <b>Heavier type</b> is a titled series. <span className="swatch">Green</span> is a meditation camp. <Unsure /> is uncertain in the source. "of 44" is the length of the whole series on the wiki.
    </p>
  );
}
