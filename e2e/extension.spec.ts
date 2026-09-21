import { test, expect, type Page } from "@playwright/test"

// E2E tests for the openlist-ext frontend against a live openlist-ext backend.
//
// The backend (openlist-ext) embeds OpenList in-process and serves the built
// frontend dist on the same origin (port 5245). It also exposes an
// unauthenticated /ext/healthz endpoint that the frontend probes on
// manage-panel mount to decide whether to show the "Extension" menu group
// (forward compatibility: stock OpenList has no /ext/* and the group must be
// hidden).
//
// The workflow starts the backend with OPENLIST_ADMIN_PASSWORD=admin so the
// admin login is deterministic (admin / admin).
//
// Selectors are text-based ("Login", "Extension", "Input your username") and
// rely on the English dictionary. playwright.config.ts forces locale "en-US"
// and the init script below pins localStorage("lang") = "en" so the app's
// i18n resolves to English regardless of the runner's browser language.

const BASE = process.env.E2E_BASE_URL || "http://localhost:5245"

// Pin the UI language to English before any page script runs, so the
// text-based selectors match the English dictionary strings deterministically.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("lang", "en")
    } catch {
      /* ignore: some about:blank contexts have no storage */
    }
  })
})

// Log in as admin via the real login form and land on the manage panel.
async function loginAsAdmin(page: Page) {
  await page.goto("/@manage")
  // The login page renders when not authenticated.
  await page.getByPlaceholder("Input your username").fill("admin")
  await page.getByPlaceholder("Input your password").fill("admin")
  await page.getByRole("button", { name: "Login", exact: true }).click()
  // Wait for the manage panel shell to render by looking for the side menu.
  await expect(page).toHaveURL(/\/@manage/, { timeout: 30_000 })
}

test.describe("openlist-ext backend health", () => {
  test("/ext/healthz returns 200 (extension backend present)", async ({
    request,
  }) => {
    const resp = await request.get("/ext/healthz")
    expect(resp.status()).toBe(200)
  })

  test("root serves the built frontend index.html", async ({ request }) => {
    const resp = await request.get("/")
    expect(resp.status()).toBe(200)
    const body = await resp.text()
    // The built frontend index references the app root div.
    expect(body).toContain('<div id="root"')
  })
})

test.describe("Extension menu forward compatibility", () => {
  test("Extension group is visible when /ext/healthz is reachable", async ({
    page,
  }) => {
    await loginAsAdmin(page)
    // The "Extension" side-menu group should be present because the
    // openlist-ext backend answers /ext/healthz with 200.
    await expect(page.getByText("Extension", { exact: true })).toBeVisible({
      timeout: 30_000,
    })
  })

  test("Extension group is hidden when /ext/healthz is absent (stock OpenList)", async ({
    page,
  }) => {
    // Simulate a backend without the extension: intercept the healthz probe
    // and respond 404 before the manage panel reads it. This exercises the
    // extAvailable() gating against the real UI without needing a second,
    // stock-OpenList backend.
    await page.route("**/ext/healthz", (route) =>
      route.fulfill({ status: 404, body: "not found" }),
    )

    await loginAsAdmin(page)
    // The manage panel calls probeAvailability() on mount; with the route
    // intercept returning 404 it resolves available=false and the Extension
    // group is removed from the DOM. toHaveCount(0) polls for up to the
    // configured expect timeout (20s), so it tolerates the probe's async
    // resolution without a fixed sleep.
    await expect(page.getByText("Extension", { exact: true })).toHaveCount(0)
  })
})
