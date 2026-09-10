import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

/** Exercise the shared card lifecycle across desktop and touch browser engines. */
export default defineConfig({
  ...base,
  testMatch: [
    "**/card-motion.spec.ts",
    "**/featured-motion.spec.ts",
    "**/project-preview.spec.ts",
  ],
  outputDir: "test-results/motion",
  use: { ...base.use, launchOptions: {} },
  projects: [
    ...(base.projects ?? []).map((project) => ({
      ...project,
      use: { ...project.use, launchOptions: base.use?.launchOptions },
    })),
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"] } },
  ],
});
