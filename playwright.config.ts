import { defineConfig, devices } from "@playwright/test"

// Playwright config for the openlist-ext E2E suite.
//
// Tests run against a live openlist-ext backend (which embeds OpenList and
// serves the built frontend dist) started by the e2e workflow on
// http://localhost:5245. The base URL points at the manage panel.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5245",
    // Force English so the text-based selectors ("Login", "Extension",
    // "Input your username") match deterministically regardless of the
    // runner's browser language. The app reads localStorage("lang") first,
    // then navigator.language; the init script below pins the former, and
    // locale pins navigator.language as a belt-and-suspenders measure.
    locale: "en-US",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
