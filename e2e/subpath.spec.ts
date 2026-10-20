import { test, expect, type Page } from "@playwright/test"

// E2E tests for subpath deployment: the whole stack (backend + frontend)
// served under a base path, as behind caddy / nginx / Apache httpd at
// https://example.com/files/.
//
// The workflow starts a second backend with SITE_URL=/files and runs the
// whole suite with E2E_BASE_PATH=/files (extension.spec.ts prefixes its
// paths with it, so every root-level flow — login, manage panel, Extension
// menu, healthz — is exercised under the prefix too). This spec adds the
// subpath-specific assertions:
//
//   - the backend injects the base path into index.html (router/API base,
//     asset base, manifest link),
//   - the SPA's hashed assets load under the prefix,
//   - index.html's base-path guard redirects a direct visit to the host
//     root into the prefix instead of rendering a blank SPA (the backend
//     serves "/" re-prefixed for strip-style proxies, so the router would
//     otherwise match no route),
//   - no request escapes the prefix.
//
// Skipped entirely when E2E_BASE_PATH is unset, so a local `pnpm e2e`
// against a root deployment is unaffected.

const basePath = process.env.E2E_BASE_PATH || ""

test.skip(!basePath, "E2E_BASE_PATH not set — not a subpath deployment")

// Pin the UI language to English before any page script runs (same reason
// as extension.spec.ts).
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("lang", "en")
    } catch {
      /* ignore: some about:blank contexts have no storage */
    }
  })
})

async function loginAsAdmin(page: Page) {
  await page.goto(basePath + "/@login")
  await page.getByPlaceholder("Input your username").fill("admin")
  await page.getByPlaceholder("Input your password").fill("admin")
  await page.getByRole("button", { name: "Login", exact: true }).click()
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem("token")))
    .not.toBeNull()
}

test.describe("subpath backend health", () => {
  test("/ext/healthz answers under the base path", async ({ request }) => {
    const resp = await request.get(basePath + "/ext/healthz")
    expect(resp.status()).toBe(200)
  })

  test("index.html is served with the base path injected", async ({
    request,
  }) => {
    const resp = await request.get(basePath + "/")
    expect(resp.status()).toBe(200)
    const body = await resp.text()
    // OpenList's static handler rewrites the injected config for subpath
    // deployments: base_path (router + API base) and cdn (asset base,
    // window.__dynamic_base__) both carry the prefix, and the manifest
    // link is prefixed too.
    expect(body).toContain(`base_path: '${basePath}'`)
    expect(body).toContain(`cdn: '${basePath}'`)
    expect(body).toContain(`href="${basePath}/manifest.json"`)
  })

  test("the SPA's entry asset loads under the base path", async ({
    request,
  }) => {
    const index = await (await request.get(basePath + "/")).text()
    // The preload list in the built index references the hashed entry
    // chunk; the runtime prefixes it with window.__dynamic_base__ (= the
    // injected cdn = the base path), so it must resolve under the prefix.
    const m = index.match(/"src":"([^"]*index-[^"]*\.js)"/)
    expect(m, "entry chunk reference found in built index.html").toBeTruthy()
    const resp = await request.get(m![1])
    expect(resp.status()).toBe(200)
  })
})

test.describe("subpath UI flows", () => {
  test("login and manage panel work under the base path", async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(basePath + "/@manage")
    await expect(page).toHaveURL(new RegExp(basePath + "/@manage"))
    await expect(page.getByText("Extension", { exact: true })).toBeVisible({
      timeout: 30_000,
    })
  })

  test("no request escapes the base path while using the app", async ({
    page,
  }) => {
    const failures: string[] = []
    const escaped: string[] = []
    page.on("response", (r) => {
      const u = r.url()
      // Same-origin requests must stay under the prefix (external CDNs
      // for preview libs are not our concern here).
      if (r.status() >= 400 && !u.includes("oplist.org")) {
        failures.push(`${r.status()} ${u}`)
      }
      if (
        u.startsWith(new URL(page.url()).origin + "/") &&
        !u.startsWith(new URL(page.url()).origin + basePath)
      ) {
        escaped.push(u)
      }
    })
    await loginAsAdmin(page)
    await page.goto(basePath + "/@manage")
    await page
      .getByText("Extension", { exact: true })
      .waitFor({ state: "visible", timeout: 30_000 })
    // Give lazy requests (settings, probes, menu data) a moment to land.
    await page.waitForLoadState("networkidle")
    expect(escaped, "same-origin URLs outside the base path").toEqual([])
    expect(failures, "failed requests").toEqual([])
  })
})

test.describe("base-path redirect guard (index.html)", () => {
  test("a direct visit to the host root redirects into the base path", async ({
    page,
  }) => {
    // The backend serves "/" re-prefixed (strip-proxy support), so the SPA
    // is reached at "/" — but its router base is the base path and would
    // match no route there. index.html's guard must send the browser into
    // the prefix before the app renders, and the app must then boot.
    await page.goto("/", { waitUntil: "networkidle" })
    await expect(page).toHaveURL(new RegExp(basePath))
    await expect(page.locator("#root")).not.toBeEmpty()
  })

  test("paths under the base path are not redirected again", async ({
    page,
  }) => {
    const resp = await page.goto(basePath + "/@login")
    expect(resp?.status()).toBe(200)
    await expect(page.getByPlaceholder("Input your username")).toBeVisible()
    // And the URL is unchanged — no redirect loop.
    await expect(page).toHaveURL(new RegExp(basePath + "/@login$"))
  })
})
