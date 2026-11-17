import { defineConfig } from "@playwright/test";
import path from "node:path";

// The built site to photograph. `make shots` sets it: first to the Python build
// (to take the reference pictures), then to the new build (to compare).
const dir = path.resolve(process.env.PARITY_DIR ?? "../_site");
const port = 8432;

export default defineConfig({
  testDir: "tests",
  // Reference pictures are rebuilt from the Python build each time, so they are not committed.
  snapshotPathTemplate: ".shots/{projectName}/{arg}{ext}",
  outputDir: ".shots-results",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: ".shots-results/report.json" }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce",
  },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1 --directory "${dir}"`,
    url: `http://127.0.0.1:${port}/robots.txt`,
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { viewport: { width: 390, height: 844 } } },
  ],
});
