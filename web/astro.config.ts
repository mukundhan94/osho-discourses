import react from "@astrojs/react";
import { defineConfig } from "astro/config";

// The new build of the site. It writes to web/dist/ and is not deployed yet:
// scripts/build.py still builds what Vercel publishes.
export default defineConfig({
  site: "https://oshodiscourses.com",
  // Every page lives at an address ending in a slash, as in vercel.json.
  trailingSlash: "always",
  build: { format: "directory" },
  // Write whitespace as authored. The parity and screenshot checks compare it
  // with the Python build, so nothing may be collapsed on the way out.
  compressHTML: false,
  integrations: [react()],
});
