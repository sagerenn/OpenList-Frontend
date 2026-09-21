// Types for the openlist-ext admin API (under /ext/admin/*).
// These mirror the Go request/response structs in
// internal/server/admin.go and the feature model packages.

import { Resp } from "./resp"

// ---- Feature 1: per-user domain ----

export interface DomainBinding {
  user_id: number
  host: string
}

// ---- Feature 2: TTL ----

export type TTLMode = "fixed" | "access"

export interface TTLConfig {
  user_id: number
  enabled: boolean
  mode: TTLMode
  // duration in seconds (JSON field: duration_seconds)
  duration_seconds: number
}

// ---- Feature 3: list permission ----

export interface ListPerm {
  user_id: number
  can_list: boolean
  can_read: boolean
}

// ---- Feature 4: load balance ----

export type LBStrategy = "round_robin" | "least_used" | "random"

export interface LBGroup {
  id: number
  name: string
  user_id: number
  strategy: LBStrategy
  path_prefix: string
}

export interface LBMember {
  id: number
  group_id: number
  mount_path: string
  weight: number
  // upload_count is incremented each time this member is selected.
  upload_count?: number
}

export interface LBGroupDetail {
  group: LBGroup
  members: LBMember[]
}

// ---- Feature 5: API keys ----

export type APIKeyScope =
  "fs.list" | "fs.get" | "fs.put" | "fs.rm" | "fs.mkdir" | "*"

export const AllAPIKeyScopes: APIKeyScope[] = [
  "fs.list",
  "fs.get",
  "fs.put",
  "fs.rm",
  "fs.mkdir",
  "*",
]

export interface APIKey {
  id: number
  user_id: number
  name: string
  // scopes is stored/serialized as a comma-separated string (e.g. "fs.list,fs.get")
  scopes: string
  enabled: boolean
  // prefix is the non-secret key prefix used for lookup/display
  prefix: string
  created_at?: string
  last_used?: string
}

// CreatedKey is returned on creation: the APIKey plus the plaintext secret
// (shown exactly once).
export interface CreatedKey extends APIKey {
  secret: string
}

// Helper: split a stored scopes string into an array.
export const splitScopes = (s: string): APIKeyScope[] =>
  s ? (s.split(",").filter(Boolean) as APIKeyScope[]) : []

// Helper: join an array of scopes into the stored comma-separated string.
export const joinScopes = (scopes: APIKeyScope[]): string =>
  scopes.filter(Boolean).join(",")

// ---- Response helpers ----

export type ExtResp<T> = Resp<T>
export type PExtResp<T> = Promise<ExtResp<T>>
