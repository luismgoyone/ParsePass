import { defineConfig, devices } from "@playwright/test";

import { appUrl, E2E } from "./tests/e2e/support/env";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The dev server compiles each route on first visit, which can outlast the default 5s.
  expect: { timeout: process.env.CI ? 5_000 : 15_000 },
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: appUrl,
    trace: "retain-on-failure",
    // Every run records a video: the spec's milestones end with a Playwright proof video.
    video: "on",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // CI runs the production build; locally the dev server is faster.
      command: process.env.CI
        ? `pnpm start --port ${E2E.appPort}`
        : `pnpm dev --port ${E2E.appPort}`,
      url: appUrl,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
