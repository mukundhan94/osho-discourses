import react from "@astrojs/react";
import type { AstroIntegration } from "astro";
import { defineConfig } from "astro/config";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// The stylesheets, script, fonts and pictures live in assets/ at the repository root,
// shared with scripts/build.py. They are published as /assets/, so they are copied in
// beside the pages once those are written.
const copyAssets: AstroIntegration = {
  name: "copy-assets",
  hooks: {
    "astro:build:done": ({ dir }) => {
      fs.cpSync(fileURLToPath(new URL("../assets", import.meta.url)), fileURLToPath(new URL("assets", dir)), { recursive: true });
    },
  },
};

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
  integrations: [react(), copyAssets],
});
