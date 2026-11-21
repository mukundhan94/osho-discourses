// Gives every series that has no address yet a row in data/slugs.csv.
// Run from the repository root with `make slugs`, or here with `npm run slugs`.
//
// An address is permanent once published, so this only ever adds rows. It loads and
// checks the data exactly as the build does, so the two cannot disagree about which
// series exist.
import { DataError, loadSite } from "../src/data/index.ts";

try {
  const site = loadSite(undefined, { addSlugs: true });
  console.log(`slugs.csv: ${site.series.length} series, each with an address`);
} catch (error) {
  if (!(error instanceof DataError)) throw error;
  console.error(error.message);
  process.exit(1);
}
