import axios from "axios"
import { createSignal } from "solid-js"
import { api, log } from "."

// extApi is a dedicated axios instance for the openlist-ext admin API.
//
// The extension's admin endpoints live under <api>/ext/admin/* (NOT under
// /api, which is OpenList's own namespace), and are guarded by adminAuth,
// which accepts either the configured static admin token or a valid OpenList
// admin user's session token. The frontend therefore reuses the same token
// the logged-in admin already holds in localStorage("token") — no separate
// extension credential is needed.
//
// The response envelope is OpenList-compatible: { code, message, data }.
// On non-2xx the interceptor returns the same shape (with the server's
// message) so callers can use the existing handleResp helper.
const instance = axios.create({
  baseURL: api + "/ext/admin",
  headers: {
    "Content-Type": "application/json;charset=utf-8",
  },
  withCredentials: false,
})

instance.interceptors.request.use(
  (config) => config,
  (error) => {
    console.log("Error: " + error.message)
    return Promise.reject(error)
  },
)

instance.interceptors.response.use(
  (response) => {
    const resp = response.data
    log(resp)
    return resp
  },
  (error) => {
    console.error(error)
    const body = error.response?.data as
      { message?: string; data?: unknown } | undefined
    const result: {
      code: number | undefined
      message: string
      data?: unknown
    } = {
      code: axios.isCancel(error) ? -1 : error.response?.status,
      message: body?.message || error.message,
    }
    if (body && typeof body === "object" && body.data != null) {
      result.data = body.data
    }
    return result
  },
)

// Keep the Authorization header in sync with the main instance's token.
// changeToken (in request.ts) updates localStorage("token"); ext requests
// read it lazily via the request interceptor below so they always use the
// current token without re-importing this module.
instance.interceptors.request.use((config) => {
  config.headers["Authorization"] = localStorage.getItem("token") || ""
  return config
})

// ---- Forward compatibility ----
//
// The extension UI must not assume the openlist-ext backend is present: the
// same frontend may run against stock OpenList (no /ext/*), an older
// extension, or a future one. probeAvailability() probes the unauthenticated
// /ext/healthz endpoint and updates a reactive signal. It never throws. The
// manage side-menu reads extAvailable() to hide the whole "Extension" group
// when the backend is absent, so stock-OpenList deployments see no broken
// pages.

const [available, setAvailable] = createSignal<boolean>(false)
export const extAvailable = available

// probeAvailability hits /ext/healthz once and caches the result in the
// signal. Safe to call repeatedly; it short-circuits once resolved true.
let probed = false
export const probeAvailability = async (): Promise<boolean> => {
  if (probed && available()) {
    return true
  }
  try {
    const resp = await axios.get(api + "/ext/healthz", {
      // short timeout: a missing endpoint returns 404 quickly; a present
      // one returns 200 instantly. Avoid blocking the UI on slow networks.
      timeout: 3000,
      validateStatus: () => true,
    })
    setAvailable(resp.status === 200)
  } catch {
    setAvailable(false)
  }
  probed = true
  return available()
}

// resetAvailability clears the cached probe result, e.g. after the user
// logs in/out or switches backend. Used by tests and the auth flow.
export const resetAvailability = (): void => {
  probed = false
  setAvailable(false)
}

export { instance as extApi }
