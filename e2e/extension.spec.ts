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

// Base path for subpath deployments (E2E_BASE_PATH=/files runs the whole
// suite against a backend configured with SITE_URL=/files). Every path
// below goes through p(), so the same spec covers root and subpath; the
// URL assertions use regexes that match either form.
const BASE_PATH = process.env.E2E_BASE_PATH || ""
const p = (path: string) => BASE_PATH + path

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
//
// After a successful login the app navigates to the redirect target, which
// defaults to base_path || "/" (the file browser home) — not /@manage. Rather
// than depend on the app's redirect behavior, we wait for the auth token to
// land in localStorage (proving login succeeded), then navigate explicitly to
// /@manage. The MustUser guard sees the token and renders the manage panel.
async function loginAsAdmin(page: Page) {
  await page.goto(p("/@login"))
  // The login page renders when not authenticated.
  await page.getByPlaceholder("Input your username").fill("admin")
  await page.getByPlaceholder("Input your password").fill("admin")
  await page.getByRole("button", { name: "Login", exact: true }).click()
  // Wait for the auth token to be persisted by changeToken(), which fires
  // before the app's post-login navigation. Polling localStorage avoids a
  // fixed sleep and tolerates the async login round-trip.
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem("token")))
    .not.toBeNull()
  // Now that we're authenticated, go to the manage panel directly.
  await page.goto(p("/@manage"))
  await expect(page).toHaveURL(/\/@manage/, { timeout: 30_000 })
}

test.describe("openlist-ext backend health", () => {
  test("/ext/healthz returns 200 (extension backend present)", async ({
    request,
  }) => {
    const resp = await request.get(p("/ext/healthz"))
    expect(resp.status()).toBe(200)
  })

  test("root serves the built frontend index.html", async ({ request }) => {
    const resp = await request.get(p("/"))
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

test.describe("Load Balance admin UI", () => {
  // Regression test for the reported bug: after creating a group in the
  // manage UI, the groups table stayed empty. Root cause: the backend's
  // GET /ext/admin/lb/group read the user id from a :user_id path param
  // that this route doesn't have, so every list call 400'd; the frontend
  // additionally suppressed the error toast and only refreshed on an
  // explicit Refresh click. This spec exercises the whole flow through the
  // real UI: pick a user, create a group, and expect it in the table.
  test("created group appears in the groups list", async ({ page }) => {
    await loginAsAdmin(page)

    // Open the Load Balance config page. (Assert on the Create button, not
    // the "Group name" text: that string matches both the form label and
    // the table column header.)
    await page.goto(p("/@manage/ext/lb"))
    await expect(
      page.getByRole("button", { name: "Create group", exact: true }),
    ).toBeVisible({ timeout: 30_000 })

    // Pick the admin user (the only seeded user in the e2e backend).
    await page.getByText("Select user").first().click()
    await page.getByRole("option", { name: /admin \(id: 1\)/ }).click()

    // Creating a group should make it appear in the groups table without an
    // explicit Refresh: user selection triggers a refresh, and onCreate
    // refreshes again after the create succeeds.
    await page.getByPlaceholder("Group name").fill("e2e-group")
    await page
      .getByRole("button", { name: "Create group", exact: true })
      .click()
    await expect(
      page.getByRole("cell", { name: "e2e-group", exact: true }),
    ).toBeVisible({ timeout: 20_000 })
  })
})
