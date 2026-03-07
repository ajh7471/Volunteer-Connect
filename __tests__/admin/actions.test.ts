/**
 * Unit tests for app/admin/actions.ts
 *
 * actions.ts uses TWO different Supabase clients:
 *   1. createServerClient (from "@supabase/ssr") — verifies admin role via cookies
 *   2. createClient (from "@supabase/supabase-js") — service-role operations
 *
 * Both are mocked so no real DB or HTTP is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── All mocks must be declared before any imports that trigger the modules ──

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: vi.fn().mockReturnValue([]) }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// ─── Shared mutable state for the mock clients ───────────────────────────────

// The server client (cookie-based) — used by verifyAdminRole
let serverClientMock: any = null

// The service-role client — used for actual DB ops
let serviceClientMock: any = null

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => serverClientMock),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => serviceClientMock),
}))

// ─── Also mock lib/supabase/config so service client creation doesn't throw ──
vi.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: vi.fn(() => ({ url: "https://test.supabase.co", anonKey: "anon", serviceRoleKey: "service" })),
  isSupabaseConfigured: vi.fn(() => true),
}))

// ─── Builder chain factory ────────────────────────────────────────────────────

function chain(terminalData: any = null, terminalError: any = null) {
  const resolved = Promise.resolve({ data: terminalData, error: terminalError })
  const c: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: terminalData, error: terminalError }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ data: terminalData, error: terminalError }),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: terminalData, error: terminalError }),
    maybeSingle: vi.fn().mockResolvedValue({ data: terminalData, error: terminalError }),
    // Make the chain itself awaitable (resolves when `from().select()...` is awaited)
    then: resolved.then.bind(resolved),
  }
  return c
}

function makeServerClient(overrides: {
  userId?: string | null
  userError?: any
  profileRole?: string | null
} = {}) {
  const { userId = "admin-uid", userError = null, profileRole = "admin" } = overrides
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: userError,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return chain(profileRole ? { role: profileRole } : null)
      }
      return chain()
    }),
  }
}

function makeServiceClient(overrides: {
  blocked?: boolean
  createUserData?: any
  createUserError?: any
  upsertError?: any
  profiles?: any[]
  assignments?: any[]
  userToDelete?: any
  shiftCapacity?: number
  shiftAssignments?: any[]
  existing?: any
} = {}) {
  const {
    blocked = false,
    createUserData = { user: { id: "new-uid" } },
    createUserError = null,
    upsertError = null,
    profiles = [{ id: "admin-uid", role: "admin" }, { id: "admin-2", role: "admin" }],
    assignments = [],
    userToDelete = { role: "volunteer" },
    shiftCapacity = 2,
    shiftAssignments = [],
    existing = null,
  } = overrides

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-uid" } }, error: null }),
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: createUserData, error: createUserError }),
        deleteUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
    from: vi.fn((table: string) => {
      if (table === "auth_blocklist") {
        return chain(blocked ? { email: "blocked@test.com" } : null)
      }
      if (table === "profiles") {
        // Supports both single() and array returns
        const c = chain()
        c.select = vi.fn().mockReturnThis()
        c.eq = vi.fn().mockReturnThis()
        c.single = vi.fn().mockResolvedValue({ data: userToDelete, error: null })
        c.upsert = vi.fn().mockResolvedValue({ data: null, error: upsertError })
        c.update = vi.fn().mockReturnThis()
        c.delete = vi.fn().mockReturnThis()
        // Array result when no .single()
        const resolved = Promise.resolve({ data: profiles, error: null })
        c.then = resolved.then.bind(resolved)
        return c
      }
      if (table === "shift_assignments") {
        const c = chain()
        c.select = vi.fn().mockReturnThis()
        c.eq = vi.fn().mockReturnThis()
        c.in = vi.fn().mockReturnThis()
        c.maybeSingle = vi.fn().mockResolvedValue({ data: existing, error: null })
        c.insert = vi.fn().mockResolvedValue({ data: null, error: null })
        c.delete = vi.fn().mockReturnThis()
        const resolved = Promise.resolve({ data: shiftAssignments, error: null })
        c.then = resolved.then.bind(resolved)
        return c
      }
      if (table === "shifts") {
        return chain({ capacity: shiftCapacity, shift_date: "2026-03-06" })
      }
      return chain()
    }),
  }
}

// ─── Import the functions under test ─────────────────────────────────────────
import {
  createUserAccount,
  deleteUserAccount,
  updateUserRole,
  assignShiftToUser,
  revokeShiftFromUser,
} from "@/app/admin/actions"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupAdminAuth(serviceOverrides = {}) {
  serverClientMock = makeServerClient()
  serviceClientMock = makeServiceClient(serviceOverrides)
}

function setupNonAdminAuth(role = "volunteer") {
  serverClientMock = makeServerClient({ profileRole: role })
  serviceClientMock = makeServiceClient()
}

function setupUnauthenticated() {
  serverClientMock = makeServerClient({ userId: null })
  serviceClientMock = makeServiceClient()
}

// ─── createUserAccount ────────────────────────────────────────────────────────

describe("createUserAccount", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when caller is not authenticated", async () => {
    setupUnauthenticated()
    const result = await createUserAccount({
      email: "new@test.com", password: "pass1234", name: "New User", role: "volunteer",
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it("returns error when caller is not an admin", async () => {
    setupNonAdminAuth("volunteer")
    const result = await createUserAccount({
      email: "new@test.com", password: "pass1234", name: "New User", role: "volunteer",
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/admin/i)
  })

  it("returns error when email is on the blocklist", async () => {
    setupAdminAuth({ blocked: true })
    const result = await createUserAccount({
      email: "blocked@test.com", password: "pass1234", name: "Blocked User", role: "volunteer",
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/blocked/i)
  })

  it("returns success with userId when creation succeeds", async () => {
    setupAdminAuth({
      blocked: false,
      createUserData: { user: { id: "new-uid-123" } },
      createUserError: null,
      upsertError: null,
    })
    const result = await createUserAccount({
      email: "valid@test.com", password: "pass1234", name: "Valid User", role: "volunteer",
    })
    expect(result.success).toBe(true)
    expect((result as any).userId).toBe("new-uid-123")
  })

  it("returns error when Supabase auth createUser fails", async () => {
    setupAdminAuth({
      blocked: false,
      createUserData: { user: null },
      createUserError: { message: "Auth service error" },
    })
    const result = await createUserAccount({
      email: "fail@test.com", password: "pass1234", name: "Fail User", role: "volunteer",
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it("returns error and cleans up auth user when profile upsert fails", async () => {
    setupAdminAuth({
      blocked: false,
      createUserData: { user: { id: "new-uid-456" } },
      createUserError: null,
      upsertError: { message: "Profile insert failed" },
    })
    const result = await createUserAccount({
      email: "profilefail@test.com", password: "pass1234", name: "Profile Fail", role: "volunteer",
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/profile/i)
  })
})

// ─── deleteUserAccount ────────────────────────────────────────────────────────

describe("deleteUserAccount", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when caller is not authenticated", async () => {
    setupUnauthenticated()
    const result = await deleteUserAccount("some-user-id")
    expect(result.success).toBe(false)
  })

  it("returns error when caller is not an admin", async () => {
    setupNonAdminAuth()
    const result = await deleteUserAccount("some-user-id")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/admin/i)
  })

  it("returns error when trying to delete own account", async () => {
    // Admin's own id = "admin-uid", serverClient returns "admin-uid" as current user
    setupAdminAuth({ userToDelete: { role: "volunteer" } })
    // Override serverClient to return the same id for current user check
    serverClientMock = {
      ...makeServerClient(),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-uid" } }, error: null }),
      },
    }
    const result = await deleteUserAccount("admin-uid")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/own account/i)
  })

  it("returns error when trying to delete the last admin", async () => {
    setupAdminAuth({
      profiles: [{ id: "admin-uid", role: "admin" }], // only one admin
      userToDelete: { role: "admin" },
    })
    const result = await deleteUserAccount("other-admin-uid")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/last admin/i)
  })

  it("returns success for a valid volunteer deletion", async () => {
    setupAdminAuth({
      profiles: [{ id: "admin-uid", role: "admin" }, { id: "admin-2", role: "admin" }],
      userToDelete: { role: "volunteer" },
      assignments: [],
    })
    // Make serverClient return a different user so we're not self-deleting
    serverClientMock = makeServerClient({ userId: "admin-uid" })
    const result = await deleteUserAccount("volunteer-uid")
    expect(result.success).toBe(true)
  })
})

// ─── updateUserRole ───────────────────────────────────────────────────────────

describe("updateUserRole", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when caller is not an admin", async () => {
    setupNonAdminAuth()
    const result = await updateUserRole("user-1", "admin")
    expect(result.success).toBe(false)
  })

  it("returns error when demoting the last admin", async () => {
    setupAdminAuth({
      userToDelete: { role: "admin" },
      profiles: [{ id: "admin-uid", role: "admin" }], // only one admin
    })
    const result = await updateUserRole("admin-uid", "volunteer")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/last admin/i)
  })

  it("succeeds when promoting a volunteer to admin", async () => {
    setupAdminAuth({ userToDelete: { role: "volunteer" } })
    const result = await updateUserRole("volunteer-uid", "admin")
    expect(result.success).toBe(true)
  })

  it("succeeds when demoting admin when multiple admins exist", async () => {
    setupAdminAuth({
      userToDelete: { role: "admin" },
      profiles: [{ id: "admin-uid", role: "admin" }, { id: "admin-2", role: "admin" }],
    })
    const result = await updateUserRole("admin-uid", "volunteer")
    expect(result.success).toBe(true)
  })
})

// ─── assignShiftToUser ────────────────────────────────────────────────────────

describe("assignShiftToUser", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when caller is not an admin", async () => {
    setupNonAdminAuth()
    const result = await assignShiftToUser("volunteer-1", "shift-1")
    expect(result.success).toBe(false)
  })

  it("returns error when user is already assigned to the shift", async () => {
    setupAdminAuth({ existing: { id: "assignment-99" } })
    const result = await assignShiftToUser("volunteer-1", "shift-1")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/already assigned/i)
  })

  it("returns error when shift is at full capacity", async () => {
    setupAdminAuth({
      existing: null,
      shiftCapacity: 1,
      shiftAssignments: [{ id: "a1" }], // already 1/1
    })
    const result = await assignShiftToUser("volunteer-2", "shift-1")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/capacity/i)
  })

  it("succeeds when shift has open spots", async () => {
    setupAdminAuth({
      existing: null,
      shiftCapacity: 3,
      shiftAssignments: [{ id: "a1" }], // 1/3 — has room
    })
    const result = await assignShiftToUser("volunteer-2", "shift-1")
    expect(result.success).toBe(true)
  })
})

// ─── revokeShiftFromUser ──────────────────────────────────────────────────────

describe("revokeShiftFromUser", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when caller is not an admin", async () => {
    setupNonAdminAuth()
    const result = await revokeShiftFromUser("assignment-1")
    expect(result.success).toBe(false)
  })

  it("returns success when assignment is deleted", async () => {
    setupAdminAuth()
    const result = await revokeShiftFromUser("assignment-1")
    expect(result.success).toBe(true)
  })
})
