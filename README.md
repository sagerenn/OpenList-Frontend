# OpenList (frontend)

![License MIT](https://img.shields.io/badge/license-MIT-green)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/OpenListTeam/OpenList-Frontend)](./package.json)
[![NPM Version](https://img.shields.io/npm/v/%40openlist-frontend%2Fopenlist-frontend)](https://www.npmjs.com/package/@openlist-frontend/openlist-frontend)
[![NPM Downloads](https://img.shields.io/npm/dw/%40openlist-frontend%2Fopenlist-frontend)](https://www.npmjs.com/package/@openlist-frontend/openlist-frontend)
[![NPM Last Update](https://img.shields.io/npm/last-update/%40openlist-frontend%2Fopenlist-frontend)](https://www.npmjs.com/package/@openlist-frontend/openlist-frontend)

## BUILD

You can use [the build script](./build.sh).

```plaintext
Usage: ./build.sh [--dev|--release] [--compress|--no-compress] [--enforce-tag] [--skip-i18n] [--lite]

Options (will overwrite environment setting):
  --dev         Build development version
  --release     Build release version (will check if git tag match package.json version)
  --compress    Create compressed archive
  --no-compress Skip compression
  --enforce-tag Force git tag requirement for both dev and release builds
  --skip-i18n   Skip i18n build step
  --lite        Build lite version

Environment variables:
  OPENLIST_FRONTEND_BUILD_MODE=dev|release (default: dev)
  OPENLIST_FRONTEND_BUILD_COMPRESS=true|false (default: false)
  OPENLIST_FRONTEND_BUILD_ENFORCE_TAG=true|false (default: false)
  OPENLIST_FRONTEND_BUILD_SKIP_I18N=true|false (default: false)
```

## Extension (openlist-ext) configuration UI

This frontend ships an optional **Extension** section in the manage panel that
configures the six features of
[openlist-ext](https://github.com/OpenListTeam/OpenList) (per-user domain, file
TTL, list permission, upload load-balancing, API-key auth, forward
compatibility). The pages live under `src/pages/manage/ext/` and are wired
through the side menu (`sidemenu_items.tsx`), routes (`routes.tsx`), and i18n
(`src/lang/en/ext.json`).

### Forward compatibility

The same frontend bundle may run against **stock OpenList** (no extension
backend), an older extension, or a future one. The UI must never break the rest
of the manage panel in those cases:

- On manage-panel mount, `probeAvailability()` (`src/utils/ext_api.ts`) hits the
  unauthenticated `/ext/healthz` endpoint once with a short timeout and never
  throws. The result is cached in a reactive `extAvailable()` signal.
- Every Extension menu item and route is flagged `ext: true`. The side menu
  (`SideMenu.tsx`) and route filter (`index.tsx`) hide the entire Extension
  group when `extAvailable()` is false, so stock-OpenList deployments see no
  broken or empty pages.
- The extension API client (`extApi`) is a **separate** axios instance from
  OpenList's own `r` client, pointed at `/ext/admin/*` (outside OpenList's
  `/api` namespace). Its response interceptor normalizes errors into the same
  `{ code, message, data }` envelope, so every page uses the existing
  `handleResp` helper and surfaces failures as a toast — never an uncaught
  throw.
- Auth reuses the logged-in admin's session token already in
  `localStorage("token")`; the extension backend accepts it via an OpenList
  `/api/me` role check. No separate extension credential is configured in the
  UI.

### Pages

| Page              | Feature                           | Endpoints                                                  |
| ----------------- | --------------------------------- | ---------------------------------------------------------- |
| `Domain.tsx`      | Per-user domain routing           | `GET/POST/DELETE /ext/admin/domain`                        |
| `Ttl.tsx`         | Per-user file TTL + sweep         | `GET/PUT /ext/admin/ttl/:uid`, `POST /ext/admin/ttl/sweep` |
| `ListPerm.tsx`    | Per-user list/read permission     | `GET/PUT /ext/admin/listperm/:uid`                         |
| `LoadBalance.tsx` | Upload load-balancing groups      | `GET/POST/DELETE /ext/admin/lb/group[/:id[/member]]`       |
| `ApiKeys.tsx`     | Scoped API keys (one-time secret) | `GET/POST/DELETE/PUT /ext/admin/apikey`                    |

`UserPicker.tsx` is a shared user selector that loads OpenList's
`/api/admin/user/list`.

### Building with the extension

No special build flag is needed — the pages are standard lazy-loaded manage
routes and are included in every build. When the bundle runs against a backend
without `/ext/healthz`, the Extension section is simply hidden.

## LICENSE

MIT

## CREDITS

[OpenList](https://github.com/OpenListTeam/OpenList) is a resilient, community-driven fork of [AList](https://github.com/AlistGo/alist) — built to defend open source against trust-based attacks.
