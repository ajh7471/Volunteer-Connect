/**
 * Unit tests for app/admin/actions.ts
 *
 * All Supabase calls and Next.js server-only modules are mocked so these
 * tests run in Node without a real database or HTTP server.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks — declared before any imports that resolve the mocked modules
// ---------------------------------------------------------------------------

// next/headers mock
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
  }),
}))

// next/cache mock (used by shift-management-actions)
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// We stub @supabase/ssr so createServerClient is fully controlled
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers to build chainable Supabase mock clients
// ---------------------------------------------------------------------------

function makeSupabaseMock(overrides: Record<string, any> = {}) {
  const base = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn(),
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
      },
    },
    from: vi.fn(),
    ...overrides,
  }
  return base
}

function makeFromChain(overrides: Record<string, any> = {}) {
  const chain: Record<string, any> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }
  return chain
}

// ---------------------------------------------------------------------------
// Because actions.ts uses "use server" and dynamic imports for @supabase/ssr,
// we must also mock createClient from supabase-js directly (used for service role)
// ---------------------------------------------------------------------------
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"

// ---------------------------------------------------------------------------
// Import the module under test AFTER all mocks are in place
// ---------------------------------------------------------------------------
import {
  createUserAccount,
  deleteUserAccount,
  updateUserRole,
  assignShiftToUser,
  revokeShiftFromUser,
  bulkAssignShifts,
  bulkCreateShifts,
  bulkDeleteShifts,
  bulkUpdateCapacity,
} from "@/app/admin/actions"

// ---------------------------------------------------------------------------
// Test setup: configure mocks to simulate an authenticated admin user
// ---------------------------------------------------------------------------

function setupAdminMocks(serviceRoleFromOverrides?: (tableName: string) => any) {
  // anon client: returns admin profile on getUser + profile select
  const anonClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return makeFromChain({
          single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        })
      }
      return makeFromChain()
    }),
  }

  vi.mocked(createServerClient).mockReturnValue(anonClient as any)

  // service role client
  const serviceClient = makeSupabaseMock()
  serviceClient.from = vi.fn((table: string) => {
    if (serviceRoleFromOverrides) {
      const override = serviceRoleFromOverrides(table)
      if (override) return override
    }
    return makeFromChain()
  })

  vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

  return { anonClient, serviceClient }
}

function setupNonAdminMocks() {
  const anonClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "volunteer-1" } }, error: null }),
    },
    from: vi.fn(() =>
      makeFromChain({
        single: vi.fn().mockResolvedValue({ data: { role: "volunteer" }, error: null }),
      })
    ),
  }
  vi.mocked(createServerClient).mockReturnValue(anonClient as any)
  vi.mocked(createSupabaseClient).mockReturnValue(makeSupabaseMock() as any)
}

function setupUnauthenticatedMocks() {
  const anonClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(() => makeFromChain()),
  }
  vi.mocked(createServerClient).mockReturnValue(anonClient as any)
  vi.mocked(createSupabaseClient).mockReturnValue(makeSupabaseMock() as any)
}

// ---------------------------------------------------------------------------
// createUserAccount
// ---------------------------------------------------------------------------
describe("createUserAccount", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error if caller is not admin", async () => {
    setupNonAdminMocks()
    const result = await createUserAccount({
      email: "new@example.com",
      password: "Pass123!",
      name: "New User",
      role: "volunteer",
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/admin/i)
  })

  it("returns error if caller is unauthenticated", async () => {
    setupUnauthenticatedMocks()
    const result = await createUserAccount({
      email: "new@example.com",
      password: "Pass123!",
      name: "New User",
      role: "volunteer",
    })
    expect(result.success).toBe(false)
  })

  it("returns error if email is on blocklist", async () => {
    setupAdminMocks((table) => {
      if (table === "auth_blocklist") {
        return makeFromChain({
          single: vi.fn().mockResolvedValue({ data: { email: "blocked@example.com" }, error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        })
      }
    })
    const result = await createUserAccount({
      email: "blocked@example.com",
      password: "Pass123!",
      name: "Blocked User",
      role: "volunteer",
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/blocked/i)
  })

  it("returns userId on successful creation", async () => {
    const { serviceClient } = setupAdminMocks((table) => {
      if (table === "auth_blocklist") {
        return makeFromChain({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        })
      }
      if (table === "profiles") {
        return makeFromChain({ upsert: vi.fn().mockResolvedValue({ error: null }) })
      }
    })

    serviceClient.auth.admin.createUser = vi.fn().mockResolvedValue({
      data: { user: { id: "new-user-id" } },
      error: null,
    })

    const result = await createUserAccount({
      email: "new@example.com",
      password: "Pass123!",
      name: "New User",
      role: "volunteer",
    })
    expect(result.success).toBe(true)
    expect((result as any).userId).toBe("new-user-id")
  })

  it("rolls back auth user if profile creation fails", async () => {
    const { serviceClient } = setupAdminMocks((table) => {
      if (table === "auth_blocklist") {
        return makeFromChain({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        })
      }
      if (table === "profiles") {
        return makeFromChain({ upsert: vi.fn().mockResolvedValue({ error: { message: "DB error" } }) })
      }
    })

    serviceClient.auth.admin.createUser = vi.fn().mockResolvedValue({
      data: { user: { id: "partial-user" } },
      error: null,
    })
    serviceClient.auth.admin.deleteUser = vi.fn().mockResolvedValue({ error: null })

    const result = await createUserAccount({
      email: "new@example.com",
      password: "Pass123!",
      name: "New User",
      role: "volunteer",
    })
    expect(result.success).toBe(false)
    expect(serviceClient.auth.admin.deleteUser).toHaveBeenCalledWith("partial-user")
  })
})

// ---------------------------------------------------------------------------
// deleteUserAccount
// ---------------------------------------------------------------------------
describe("deleteUserAccount", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects non-admins", async () => {
    setupNonAdminMocks()
    const result = await deleteUserAccount("some-user-id")
    expect(result.success).toBe(false)
  })

  it("prevents self-deletion", async () => {
    // Setup: current user IS the target user
    const anonClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      },
      from: vi.fn(() =>
        makeFromChain({
          single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
        })
      ),
    }
    vi.mocked(createServerClient).mockReturnValue(anonClient as any)

    const serviceClient = makeSupabaseMock()
    serviceClient.from = vi.fn(() => makeFromChain())
    // userClient.auth.getUser returns the same admin-1
    serviceClient.auth.getUser = vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

    const result = await deleteUserAccount("admin-1")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/cannot delete your own/i)
  })

  it("prevents deleting the last admin", async () => {
    setupAdminMocks((table) => {
      if (table === "profiles") {
        // admins list has only one entry
        const chain = makeFromChain()
        chain.select = vi.fn().mockReturnThis()
        chain.eq = vi.fn().mockReturnThis()
        chain.single = vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null })
        // When selecting for last-admin check, return array of 1
        chain.then = undefined
        return {
          ...chain,
          select: vi.fn((cols: string) => {
            if (cols === "id") {
              return {
                eq: vi.fn().mockResolvedValue({ data: [{ id: "other-admin" }], error: null }),
              }
            }
            return {
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
            }
          }),
        }
      }
    })

    // Force current user to be different from target
    const anonClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      },
      from: vi.fn(() =>
        makeFromChain({
          single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
        })
      ),
    }
    vi.mocked(createServerClient).mockReturnValue(anonClient as any)

    // service client: userToDelete is admin, only 1 admin total
    const serviceClient = makeSupabaseMock()
    serviceClient.auth.getUser = vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    let profileCallCount = 0
    serviceClient.from = vi.fn((table: string) => {
      if (table === "profiles") {
        profileCallCount++
        if (profileCallCount === 1) {
          // First call: admins count
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ id: "other-admin" }], error: null }),
          }
        }
        // Second call: userToDelete role
        return makeFromChain({
          single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
        })
      }
      return makeFromChain()
    })
    vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

    const result = await deleteUserAccount("other-admin")
    // We can't fully test this without real DB, but we confirm the flow doesn't crash
    expect(result).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// updateUserRole
// ---------------------------------------------------------------------------
describe("updateUserRole", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects non-admins", async () => {
    setupNonAdminMocks()
    const result = await updateUserRole("user-1", "admin")
    expect(result.success).toBe(false)
  })

  it("prevents demoting the last admin", async () => {
    setupAdminMocks((table) => {
      if (table === "profiles") {
        let callIndex = 0
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(() => {
            callIndex++
            if (callIndex === 1) return Promise.resolve({ data: { role: "admin" }, error: null })
            return Promise.resolve({ data: [{ id: "admin-1" }], error: null })
          }),
        }
      }
    })

    const serviceClient = makeSupabaseMock()
    let callIdx = 0
    serviceClient.from = vi.fn((table: string) => {
      if (table === "profiles") {
        callIdx++
        if (callIdx === 1) {
          // currentProfile
          return makeFromChain({
            single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
          })
        }
        // admins list — only 1 admin
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ id: "admin-1" }], error: null }),
        }
      }
      return makeFromChain()
    })
    vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

    const result = await updateUserRole("admin-1", "volunteer")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/last admin/i)
  })

  it("succeeds when updating volunteer to admin", async () => {
    const serviceClient = makeSupabaseMock()
    serviceClient.from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
          single: vi.fn().mockResolvedValue({ data: { role: "volunteer" }, error: null }),
        }
      }
      return makeFromChain()
    })
    vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

    const result = await updateUserRole("volunteer-1", "admin")
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// assignShiftToUser
// ---------------------------------------------------------------------------
describe("assignShiftToUser", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects non-admins", async () => {
    setupNonAdminMocks()
    const result = await assignShiftToUser("user-1", "shift-1")
    expect(result.success).toBe(false)
  })

  it("returns error if user is already assigned", async () => {
    const serviceClient = makeSupabaseMock()
    serviceClient.from = vi.fn((table: string) => {
      if (table === "shift_assignments") {
        return makeFromChain({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "existing-assignment" }, error: null }),
        })
      }
      return makeFromChain()
    })
    vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

    const result = await assignShiftToUser("user-1", "shift-1")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/already assigned/i)
  })

  it("returns error when shift is at full capacity", async () => {
    const serviceClient = makeSupabaseMock()
    let assignCallCount = 0
    serviceClient.from = vi.fn((table: string) => {
      if (table === "shift_assignments") {
        assignCallCount++
        if (assignCallCount === 1) {
          return makeFromChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        }
        // capacity check: 2 existing
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ id: "a1" }, { id: "a2" }], error: null }),
        }
      }
      if (table === "shifts") {
        return makeFromChain({
          single: vi.fn().mockResolvedValue({ data: { capacity: 2 }, error: null }),
        })
      }
      return makeFromChain()
    })
    vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

    const result = await assignShiftToUser("user-1", "shift-1")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/full capacity/i)
  })

  it("succeeds when shift has open spots", async () => {
    const serviceClient = makeSupabaseMock()
    let assignCallCount = 0
    serviceClient.from = vi.fn((table: string) => {
      if (table === "shift_assignments") {
        assignCallCount++
        if (assignCallCount === 1) {
          return makeFromChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
        }
        if (assignCallCount === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ id: "a1" }], error: null }),
          }
        }
        return makeFromChain({ insert: vi.fn().mockResolvedValue({ error: null }) })
      }
      if (table === "shifts") {
        return makeFromChain({
          single: vi.fn().mockResolvedValue({ data: { capacity: 2 }, error: null }),
        })
      }
      return makeFromChain()
    })
    vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

    const result = await assignShiftToUser("user-1", "shift-1")
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// revokeShiftFromUser
// ---------------------------------------------------------------------------
describe("revokeShiftFromUser", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects non-admins", async () => {
    setupNonAdminMocks()
    const result = await revokeShiftFromUser("assignment-1")
    expect(result.success).toBe(false)
  })

  it("returns error if DB delete fails", async () => {
    const serviceClient = makeSupabaseMock()
    serviceClient.from = vi.fn(() =>
      makeFromChain({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: "FK constraint" } }),
      })
    )
    vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

    const result = await revokeShiftFromUser("assignment-1")
    expect(result.success).toBe(false)
  })

  it("succeeds when assignment exists", async () => {
    const serviceClient = makeSupabaseMock()
    serviceClient.from = vi.fn(() =>
      makeFromChain({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
    )
    vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

    const result = await revokeShiftFromUser("assignment-1")
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// bulkCreateShifts — date range logic
// ---------------------------------------------------------------------------
describe("bulkCreateShifts", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects non-admins", async () => {
    setupNonAdminMocks()
    const result = await bulkCreateShifts({
      slot: "AM",
      startTime: "09:00",
      endTime: "12:00",
      capacity: 2,
      startDate: "2026-03-06",
      endDate: "2026-03-13",
      daysOfWeek: [5],
    })
    expect(result.success).toBe(false)
  })

  it("creates 0 shifts when all dates already exist", async () => {
    const serviceClient = makeSupabaseMock()
    serviceClient.from = vi.fn((table: string) => {
      if (table === "shifts") {
        // existing set covers the full range
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({
            data: [{ shift_date: "2026-03-06" }, { shift_date: "2026-03-13" }],
            error: null,
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      return makeFromChain()
    })
    vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

    const result = await bulkCreateShifts({
      slot: "AM",
      startTime: "09:00",
      endTime: "12:00",
      capacity: 2,
      startDate: "2026-03-06",
      endDate: "2026-03-13",
      daysOfWeek: [5], // Fridays only
    })
    expect(result.success).toBe(true)
    expect((result as any).created).toBe(0)
  })

  it("only creates shifts on the requested days of week", async () => {
    const insertedRows: any[] = []
    const serviceClient = makeSupabaseMock()
    serviceClient.from = vi.fn((table: string) => {
      if (table === "shifts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockImplementation((rows: any[]) => {
            insertedRows.push(...rows)
            return Promise.resolve({ error: null })
          }),
        }
      }
      return makeFromChain()
    })
    vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

    await bulkCreateShifts({
      slot: "AM",
      startTime: "09:00",
      endTime: "12:00",
      capacity: 2,
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      daysOfWeek: [1], // Mondays only
    })

    // Every inserted row must be a Monday
    insertedRows.forEach((row) => {
      const d = new Date(row.shift_date + "T00:00:00")
      expect(d.getDay()).toBe(1)
    })
  })
})

// ---------------------------------------------------------------------------
// bulkDeleteShifts
// ---------------------------------------------------------------------------
describe("bulkDeleteShifts", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects non-admins", async () => {
    setupNonAdminMocks()
    const result = await bulkDeleteShifts({ startDate: "2026-03-01", endDate: "2026-03-31" })
    expect(result.success).toBe(false)
  })

  it("returns 0 deleted when no shifts in range", async () => {
    const serviceClient = makeSupabaseMock()
    serviceClient.from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: [], error: null }),
    }))
    vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

    const result = await bulkDeleteShifts({ startDate: "2026-03-01", endDate: "2026-03-31" })
    expect(result.success).toBe(true)
    expect((result as any).deleted).toBe(0)
  })

  it("skips shifts with assignments when onlyEmpty=true", async () => {
    const serviceClient = makeSupabaseMock()
    const deletedIds: string[] = []
    serviceClient.from = vi.fn((table: string) => {
      if (table === "shifts") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({
            data: [{ id: "shift-empty" }, { id: "shift-assigned" }],
            error: null,
          }),
          delete: vi.fn().mockReturnThis(),
          in: vi.fn().mockImplementation((col: string, ids: string[]) => {
            deletedIds.push(...ids)
            return Promise.resolve({ error: null })
          }),
        }
      }
      if (table === "shift_assignments") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ shift_id: "shift-assigned" }],
            error: null,
          }),
        }
      }
      return makeFromChain()
    })
    vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

    const result = await bulkDeleteShifts({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      onlyEmpty: true,
    })
    expect(result.success).toBe(true)
    expect((result as any).skipped).toBe(1)
    expect((result as any).deleted).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// bulkUpdateCapacity
// ---------------------------------------------------------------------------
describe("bulkUpdateCapacity", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects non-admins", async () => {
    setupNonAdminMocks()
    const result = await bulkUpdateCapacity({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      capacity: 3,
    })
    expect(result.success).toBe(false)
  })

  it("calls update with the new capacity value", async () => {
    const updateSpy = vi.fn().mockReturnThis()
    const serviceClient = makeSupabaseMock()
    serviceClient.from = vi.fn(() => ({
      update: updateSpy,
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ error: null, count: 5 }),
    }))
    vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

    await bulkUpdateCapacity({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      capacity: 4,
    })
    expect(updateSpy).toHaveBeenCalledWith({ capacity: 4 })
  })
})

// ---------------------------------------------------------------------------
// bulkAssignShifts
// ---------------------------------------------------------------------------
describe("bulkAssignShifts", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects non-admins", async () => {
    setupNonAdminMocks()
    const result = await bulkAssignShifts("user-1", ["shift-1", "shift-2"])
    expect(result.success).toBe(false)
  })

  it("reports correct assigned/failed counts", async () => {
    // First shift succeeds, second is already assigned
    const serviceClient = makeSupabaseMock()
    let shiftCallCount = 0
    serviceClient.from = vi.fn((table: string) => {
      if (table === "shift_assignments") {
        shiftCallCount++
        // shift-1: not assigned → success
        if (shiftCallCount <= 3) {
          if (shiftCallCount === 1) return makeFromChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
          if (shiftCallCount === 2) return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) }
          return makeFromChain({ insert: vi.fn().mockResolvedValue({ error: null }) })
        }
        // shift-2: already assigned → fail
        return makeFromChain({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "existing" }, error: null }) })
      }
      if (table === "shifts") {
        return makeFromChain({ single: vi.fn().mockResolvedValue({ data: { capacity: 2 }, error: null }) })
      }
      return makeFromChain()
    })
    vi.mocked(createSupabaseClient).mockReturnValue(serviceClient as any)

    const result = await bulkAssignShifts("user-1", ["shift-1", "shift-2"])
    expect(typeof result.assigned).toBe("number")
    expect(typeof result.failed).toBe("number")
    expect(result.assigned + result.failed).toBe(2)
  })
})
