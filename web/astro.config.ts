import react from "@astrojs/react";
import type { AstroIntegration } from "astro";
import { defineConfig } from "astro/config";
import fs from "node:fs";
import path from "node:path";
import { getBuild } from "./src/lib/build.ts";
import { checkOgImage, checkPages } from "./src/lib/checks.ts";
import { OG_IMAGE, SITE } from "./src/lib/site.ts";
import { pageUrls } from "./src/lib/sitemap.ts";
import { fileURLToPath } from "node:url";

// Runs once every page is written. The stylesheets, script, fonts and pictures live in
// assets/ at the repository root, shared with scripts/build.py, and are published as
// /assets/, so they are copied in beside the pages. Then the finished site is checked,
// as build.py checks its own: a fault here stops the build.
const finishSite: AstroIntegration = {
  name: "finish-site",
  hooks: {
    "astro:build:done": ({ dir }) => {
      const out = fileURLToPath(dir);
      fs.cpSync(fileURLToPath(new URL("../assets", import.meta.url)), path.join(out, "assets"), { recursive: true });
      fs.writeFileSync(path.join(out, ".nojekyll"), "");
      // Astro writes React's browser runtime whenever the React integration is on. No page
      // loads it, since every component is rendered at build time, so it is not published.
      const pagesUseIt = fs.readdirSync(out, { recursive: true, encoding: "utf8" })
        .some((name) => name.endsWith(".html") && fs.readFileSync(path.join(out, name), "utf8").includes("/_astro/"));
      if (!pagesUseIt) fs.rmSync(path.join(out, "_astro"), { recursive: true, force: true });
      checkOgImage(path.join(out, OG_IMAGE)); // the copy that is published, not the one in assets/
      const { site } = getBuild();
      const pages = pageUrls(site).map((url) => url.slice(SITE.length) + "index.html");
      checkPages(out, pages);
      console.log(`checked ${pages.length} pages: titles, descriptions, canonical addresses and links inside the site`);
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
  integrations: [react(), finishSite],
});
