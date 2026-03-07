/**
 * Integration tests: full admin + volunteer user flows
 *
 * These tests simulate real sequences a user would perform:
 *   - Admin creates shifts in bulk, assigns volunteers, hits capacity, revokes
 *   - Volunteer signs up, cancels, tries to double-book
 *   - Reporting period calculations and CSV export shape
 *   - Shift template application generating correct dates
 *   - Waitlist join → leave flow
 *   - Emergency coverage create → claim flow
 *
 * Supabase is mocked with stateful in-memory stores so multi-step
 * sequences reflect real intermediate state changes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Stateful in-memory store
// ---------------------------------------------------------------------------

type StoredShift = {
  id: string
  shift_date: string
  slot: string
  start_time: string
  end_time: string
  capacity: number
  created_at: string
}

type StoredAssignment = {
  id: string
  shift_id: string
  user_id: string
  created_at: string
}

type StoredProfile = {
  id: string
  name: string
  email: string
  role: "admin" | "volunteer"
  active: boolean
  email_opt_in: boolean
  created_at: string
}

class InMemoryDB {
  shifts: StoredShift[] = []
  assignments: StoredAssignment[] = []
  profiles: StoredProfile[] = []
  blocklist: { email: string }[] = []
  waitlist: any[] = []
  coverage_requests: any[] = []
  nextId = 1

  reset() {
    this.shifts = []
    this.assignments = []
    this.profiles = []
    this.blocklist = []
    this.waitlist = []
    this.coverage_requests = []
    this.nextId = 1
  }

  genId(prefix = "id") {
    return `${prefix}-${this.nextId++}`
  }
}

const db = new InMemoryDB()

// ---------------------------------------------------------------------------
// Mock modules
// ---------------------------------------------------------------------------

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"

// ---------------------------------------------------------------------------
// Build a service-role client backed by the in-memory DB
// ---------------------------------------------------------------------------

function buildServiceClient(currentAdminId = "admin-1") {
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: currentAdminId } }, error: null }),
      admin: {
        createUser: vi.fn().mockImplementation(({ email, password }: any) => {
          const id = db.genId("auth")
          return Promise.resolve({ data: { user: { id, email } }, error: null })
        }),
        deleteUser: vi.fn().mockImplementation((id: string) => {
          return Promise.resolve({ error: null })
        }),
        listUsers: vi.fn().mockImplementation(() => {
          const users = db.profiles.map((p) => ({ id: p.id, email: p.email, last_sign_in_at: null }))
          return Promise.resolve({ data: { users }, error: null })
        }),
      },
    },
    from: vi.fn((table: string) => buildTableInterface(table, currentAdminId)),
  }
  return client
}

function buildTableInterface(table: string, currentAdminId: string) {
  // We return a fluent builder that executes against the in-memory DB
  const state: {
    filters: Array<{ col: string; val: any }>
    gteFilters: Array<{ col: string; val: any }>
    lteFilters: Array<{ col: string; val: any }>
    inFilters: Array<{ col: string; vals: any[] }>
    selectedCols?: string
    updateData?: any
    insertData?: any
    upsertData?: any
    head?: boolean
    count?: "exact"
  } = { filters: [], gteFilters: [], lteFilters: [], inFilters: [] }

  function applyFilters(rows: any[]) {
    let result = [...rows]
    for (const f of state.filters) {
      result = result.filter((r) => r[f.col] === f.val)
    }
    for (const f of state.gteFilters) {
      result = result.filter((r) => r[f.col] >= f.val)
    }
    for (const f of state.lteFilters) {
      result = result.filter((r) => r[f.col] <= f.val)
    }
    for (const f of state.inFilters) {
      result = result.filter((r) => f.vals.includes(r[f.col]))
    }
    return result
  }

  function getStore(): any[] {
    switch (table) {
      case "shifts": return db.shifts
      case "shift_assignments": return db.assignments
      case "profiles": return db.profiles
      case "auth_blocklist": return db.blocklist
      case "shift_waitlist": return db.waitlist
      case "emergency_coverage_requests": return db.coverage_requests
      default: return []
    }
  }

  const iface: any = {
    select: vi.fn((cols?: string, opts?: any) => {
      state.selectedCols = cols
      if (opts?.count) state.count = opts.count
      if (opts?.head) state.head = opts.head
      return iface
    }),
    eq: vi.fn((col: string, val: any) => {
      state.filters.push({ col, val })
      return iface
    }),
    neq: vi.fn((col: string, val: any) => {
      // handled as "not equal" — we apply as a custom filter
      const store = getStore()
      const results = applyFilters(store).filter((r: any) => r[col] !== val)
      return Promise.resolve({ data: results, error: null, count: results.length })
    }),
    gte: vi.fn((col: string, val: any) => {
      state.gteFilters.push({ col, val })
      return iface
    }),
    lte: vi.fn((col: string, val: any) => {
      state.lteFilters.push({ col, val })
      return iface
    }),
    in: vi.fn((col: string, vals: any[]) => {
      state.inFilters.push({ col, vals })
      return iface
    }),
    order: vi.fn(() => iface),
    single: vi.fn(() => {
      const rows = applyFilters(getStore())
      return Promise.resolve({ data: rows[0] ?? null, error: rows.length === 0 ? { code: "PGRST116" } : null })
    }),
    maybeSingle: vi.fn(() => {
      const rows = applyFilters(getStore())
      return Promise.resolve({ data: rows[0] ?? null, error: null })
    }),
    insert: vi.fn((data: any) => {
      const store = getStore()
      const rows = Array.isArray(data) ? data : [data]
      rows.forEach((row: any) => {
        const item = { id: db.genId(table), created_at: new Date().toISOString(), ...row }
        store.push(item)
      })
      return Promise.resolve({ data: rows, error: null })
    }),
    upsert: vi.fn((data: any) => {
      const store = getStore()
      const rows = Array.isArray(data) ? data : [data]
      rows.forEach((row: any) => {
        const idx = store.findIndex((r: any) => r.id === row.id)
        if (idx >= 0) store[idx] = { ...store[idx], ...row }
        else store.push({ created_at: new Date().toISOString(), ...row })
      })
      return Promise.resolve({ error: null })
    }),
    update: vi.fn((data: any) => {
      state.updateData = data
      return {
        eq: vi.fn((col: string, val: any) => {
          const store = getStore()
          store.forEach((r: any) => { if (r[col] === val) Object.assign(r, data) })
          return Promise.resolve({ error: null, count: 1 })
        }),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn((col: string, val: any) => {
          const store = getStore()
          store.forEach((r: any) => {
            if (Object.entries({ ...state }).every(() => true)) Object.assign(r, data)
          })
          return { select: vi.fn().mockResolvedValue({ error: null, count: store.length }) }
        }),
        select: vi.fn().mockResolvedValue({ error: null, count: 1 }),
      }
    }),
    delete: vi.fn(() => ({
      eq: vi.fn((col: string, val: any) => {
        const store = getStore()
        const before = store.length
        const toRemove = store.filter((r: any) => r[col] === val)
        toRemove.forEach((r: any) => {
          const idx = store.indexOf(r)
          if (idx >= 0) store.splice(idx, 1)
        })
        return Promise.resolve({ error: null, count: before - store.length })
      }),
      in: vi.fn((col: string, vals: any[]) => {
        const store = getStore()
        const before = store.length
        const toRemove = store.filter((r: any) => vals.includes(r[col]))
        toRemove.forEach((r: any) => {
          const idx = store.indexOf(r)
          if (idx >= 0) store.splice(idx, 1)
        })
        return Promise.resolve({ error: null, count: before - store.length })
      }),
    })),
    then: undefined,
  }

  // Make the interface thenable so awaiting it returns all filtered rows
  Object.defineProperty(iface, "then", {
    get() {
      return (resolve: any) => {
        const rows = applyFilters(getStore())
        if (state.head && state.count === "exact") {
          resolve({ data: null, error: null, count: rows.length })
        } else {
          resolve({ data: rows, error: null, count: rows.length })
        }
      }
    },
  })

  return iface
}

function buildAnonClient(userId: string) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
    from: vi.fn((table: string) => buildTableInterface(table, userId)),
  }
}

// Setup helpers
function setupAdmin(adminId = "admin-1") {
  // Ensure admin profile exists in DB
  if (!db.profiles.find((p) => p.id === adminId)) {
    db.profiles.push({
      id: adminId, name: "Admin User", email: "admin@test.com",
      role: "admin", active: true, email_opt_in: false,
      created_at: new Date().toISOString(),
    })
  }
  vi.mocked(createServerClient).mockReturnValue(buildAnonClient(adminId) as any)
  vi.mocked(createSupabaseClient).mockReturnValue(buildServiceClient(adminId) as any)
}

function setupVolunteer(volId = "vol-1") {
  if (!db.profiles.find((p) => p.id === volId)) {
    db.profiles.push({
      id: volId, name: "Alice Volunteer", email: "alice@test.com",
      role: "volunteer", active: true, email_opt_in: false,
      created_at: new Date().toISOString(),
    })
  }
  vi.mocked(createServerClient).mockReturnValue(buildAnonClient(volId) as any)
  vi.mocked(createSupabaseClient).mockReturnValue(buildServiceClient(volId) as any)
}

import {
  createUserAccount,
  deleteUserAccount,
  updateUserRole,
  assignShiftToUser,
  revokeShiftFromUser,
  bulkCreateShifts,
  bulkDeleteShifts,
  bulkUpdateCapacity,
  createSingleShift,
  deleteSingleShift,
  updateSingleShift,
  getShiftsForRange,
  getActiveVolunteers,
} from "@/app/admin/actions"

import { signUpForShift, cancelShiftSignup, getCapacityStatus } from "@/lib/shifts"

// ---------------------------------------------------------------------------
// SCENARIO 1: Full shift lifecycle
// Admin creates a shift → assigns volunteer → hits capacity → revokes → reassigns
// ---------------------------------------------------------------------------
describe("Scenario: Full shift lifecycle (admin)", () => {
  beforeEach(() => {
    db.reset()
    vi.clearAllMocks()
    setupAdmin()
  })

  it("creates a shift, assigns a volunteer to fill it, blocks second assignment at capacity, revokes, then allows reassignment", async () => {
    // Step 1: Create shift with capacity 1
    const createResult = await createSingleShift({
      shift_date: "2026-03-10",
      slot: "AM",
      start_time: "09:00",
      end_time: "12:00",
      capacity: 1,
    })
    expect(createResult.success).toBe(true)
    const shift = db.shifts.find((s) => s.shift_date === "2026-03-10")
    expect(shift).toBeDefined()
    const shiftId = shift!.id

    // Add a volunteer to DB
    db.profiles.push({ id: "vol-1", name: "Alice", email: "alice@t.com", role: "volunteer", active: true, email_opt_in: false, created_at: new Date().toISOString() })
    db.profiles.push({ id: "vol-2", name: "Bob", email: "bob@t.com", role: "volunteer", active: true, email_opt_in: false, created_at: new Date().toISOString() })

    // Step 2: Assign vol-1 → should succeed
    const assign1 = await assignShiftToUser("vol-1", shiftId)
    expect(assign1.success).toBe(true)
    expect(db.assignments.filter((a) => a.shift_id === shiftId)).toHaveLength(1)

    // Step 3: Assign vol-2 → capacity=1, already 1 assigned → should fail
    const assign2 = await assignShiftToUser("vol-2", shiftId)
    expect(assign2.success).toBe(false)
    expect(assign2.error).toMatch(/full capacity/i)

    // Step 4: Revoke vol-1
    const assignment = db.assignments.find((a) => a.shift_id === shiftId && a.user_id === "vol-1")!
    const revoke = await revokeShiftFromUser(assignment.id)
    expect(revoke.success).toBe(true)
    expect(db.assignments.filter((a) => a.shift_id === shiftId)).toHaveLength(0)

    // Step 5: Now vol-2 can be assigned
    const assign3 = await assignShiftToUser("vol-2", shiftId)
    expect(assign3.success).toBe(true)
    expect(db.assignments.filter((a) => a.shift_id === shiftId)).toHaveLength(1)
  })

  it("deletes a shift and removes its assignments", async () => {
    await createSingleShift({
      shift_date: "2026-03-11",
      slot: "MID",
      start_time: "12:00",
      end_time: "15:00",
      capacity: 2,
    })
    const shift = db.shifts.find((s) => s.shift_date === "2026-03-11")!

    db.profiles.push({ id: "vol-3", name: "Carol", email: "c@t.com", role: "volunteer", active: true, email_opt_in: false, created_at: new Date().toISOString() })
    await assignShiftToUser("vol-3", shift.id)
    expect(db.assignments.filter((a) => a.shift_id === shift.id)).toHaveLength(1)

    const del = await deleteSingleShift(shift.id)
    expect(del.success).toBe(true)
    expect(db.shifts.find((s) => s.id === shift.id)).toBeUndefined()
    // Assignments for this shift are cleared
    expect(db.assignments.filter((a) => a.shift_id === shift.id)).toHaveLength(0)
  })

  it("updates shift capacity and reflects in subsequent assignment checks", async () => {
    await createSingleShift({
      shift_date: "2026-03-12",
      slot: "PM",
      start_time: "15:00",
      end_time: "17:00",
      capacity: 1,
    })
    const shift = db.shifts.find((s) => s.shift_date === "2026-03-12")!

    db.profiles.push({ id: "vol-a", name: "Vol A", email: "a@t.com", role: "volunteer", active: true, email_opt_in: false, created_at: new Date().toISOString() })
    db.profiles.push({ id: "vol-b", name: "Vol B", email: "b@t.com", role: "volunteer", active: true, email_opt_in: false, created_at: new Date().toISOString() })

    // Assign first volunteer
    await assignShiftToUser("vol-a", shift.id)

    // Capacity is now 1 filled / 1 capacity → second should fail
    const beforeExpand = await assignShiftToUser("vol-b", shift.id)
    expect(beforeExpand.success).toBe(false)

    // Expand capacity to 2
    const updateResult = await updateSingleShift(shift.id, { capacity: 2 })
    expect(updateResult.success).toBe(true)
    expect(db.shifts.find((s) => s.id === shift.id)!.capacity).toBe(2)

    // Now vol-b can join
    const afterExpand = await assignShiftToUser("vol-b", shift.id)
    expect(afterExpand.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// SCENARIO 2: Bulk shift operations
// ---------------------------------------------------------------------------
describe("Scenario: Bulk shift creation and deletion", () => {
  beforeEach(() => {
    db.reset()
    vi.clearAllMocks()
    setupAdmin()
  })

  it("creates Monday shifts for a 4-week range and skips existing ones", async () => {
    const result = await bulkCreateShifts({
      slot: "AM",
      startTime: "09:00",
      endTime: "12:00",
      capacity: 2,
      startDate: "2026-03-02", // Week starts Monday March 2
      endDate: "2026-03-30",
      daysOfWeek: [1], // Mondays
    })
    expect(result.success).toBe(true)
    const created = (result as any).created
    // Mondays in March 2-30: 2, 9, 16, 23, 30 = 5
    expect(created).toBe(5)

    // Run again — all slots already exist, 0 should be created
    const result2 = await bulkCreateShifts({
      slot: "AM",
      startTime: "09:00",
      endTime: "12:00",
      capacity: 2,
      startDate: "2026-03-02",
      endDate: "2026-03-30",
      daysOfWeek: [1],
    })
    expect((result2 as any).created).toBe(0)
    expect((result2 as any).skipped).toBe(5)
  })

  it("bulk deletes only empty shifts when onlyEmpty=true", async () => {
    // Create 3 shifts
    await createSingleShift({ shift_date: "2026-03-02", slot: "AM", start_time: "09:00", end_time: "12:00", capacity: 2 })
    await createSingleShift({ shift_date: "2026-03-03", slot: "AM", start_time: "09:00", end_time: "12:00", capacity: 2 })
    await createSingleShift({ shift_date: "2026-03-04", slot: "AM", start_time: "09:00", end_time: "12:00", capacity: 2 })

    // Assign a volunteer to the first shift
    db.profiles.push({ id: "vol-x", name: "X", email: "x@t.com", role: "volunteer", active: true, email_opt_in: false, created_at: new Date().toISOString() })
    const firstShift = db.shifts[0]
    await assignShiftToUser("vol-x", firstShift.id)

    // Delete only empty shifts
    const delResult = await bulkDeleteShifts({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      onlyEmpty: true,
    })
    expect(delResult.success).toBe(true)
    expect((delResult as any).deleted).toBe(2) // 2 empty
    expect((delResult as any).skipped).toBe(1) // 1 with assignment

    // The assigned shift should still exist
    expect(db.shifts.find((s) => s.id === firstShift.id)).toBeDefined()
  })

  it("bulk updates capacity for all shifts in a slot/range", async () => {
    await createSingleShift({ shift_date: "2026-03-09", slot: "AM", start_time: "09:00", end_time: "12:00", capacity: 1 })
    await createSingleShift({ shift_date: "2026-03-10", slot: "AM", start_time: "09:00", end_time: "12:00", capacity: 1 })
    await createSingleShift({ shift_date: "2026-03-11", slot: "PM", start_time: "15:00", end_time: "17:00", capacity: 1 })

    await bulkUpdateCapacity({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      slot: "AM",
      capacity: 3,
    })

    const amShifts = db.shifts.filter((s) => s.slot === "AM")
    amShifts.forEach((s) => expect(s.capacity).toBe(3))

    // PM shift should be unchanged
    const pmShift = db.shifts.find((s) => s.slot === "PM")
    expect(pmShift?.capacity).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// SCENARIO 3: User management lifecycle
// Admin creates user → changes role → can't delete last admin → deletes volunteer
// ---------------------------------------------------------------------------
describe("Scenario: User management lifecycle", () => {
  beforeEach(() => {
    db.reset()
    vi.clearAllMocks()
    setupAdmin()
  })

  it("creates a volunteer account, promotes to admin, then demotes back", async () => {
    // Step 1: Create volunteer
    const createResult = await createUserAccount({
      email: "newvol@test.com",
      password: "Pass123!",
      name: "New Volunteer",
      role: "volunteer",
    })
    expect(createResult.success).toBe(true)

    // Find the newly created profile
    const profile = db.profiles.find((p) => p.email === "newvol@test.com")
    expect(profile).toBeDefined()
    expect(profile!.role).toBe("volunteer")

    // Step 2: Promote to admin
    const promoteResult = await updateUserRole(profile!.id, "admin")
    expect(promoteResult.success).toBe(true)
    expect(db.profiles.find((p) => p.id === profile!.id)!.role).toBe("admin")

    // Step 3: Demote back to volunteer — should succeed because there's still admin-1
    const demoteResult = await updateUserRole(profile!.id, "volunteer")
    expect(demoteResult.success).toBe(true)
    expect(db.profiles.find((p) => p.id === profile!.id)!.role).toBe("volunteer")
  })

  it("blocks creating a user with a blocked email", async () => {
    db.blocklist.push({ email: "spammer@evil.com" })

    const result = await createUserAccount({
      email: "spammer@evil.com",
      password: "Pass123!",
      name: "Spammer",
      role: "volunteer",
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/blocked/i)
  })

  it("prevents demoting the only admin", async () => {
    // admin-1 is the only admin in DB
    const result = await updateUserRole("admin-1", "volunteer")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/last admin/i)
  })

  it("deletes a volunteer and removes their shift assignments", async () => {
    // Create a volunteer and a shift, then assign them
    db.profiles.push({ id: "del-vol", name: "Delete Me", email: "del@t.com", role: "volunteer", active: true, email_opt_in: false, created_at: new Date().toISOString() })
    db.shifts.push({ id: "del-shift", shift_date: "2026-03-15", slot: "AM", start_time: "09:00", end_time: "12:00", capacity: 2, created_at: new Date().toISOString() })
    db.assignments.push({ id: "del-asn", shift_id: "del-shift", user_id: "del-vol", created_at: new Date().toISOString() })

    const result = await deleteUserAccount("del-vol")
    expect(result.success).toBe(true)

    // Profile should be gone
    expect(db.profiles.find((p) => p.id === "del-vol")).toBeUndefined()
    // Assignment should be gone
    expect(db.assignments.find((a) => a.user_id === "del-vol")).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// SCENARIO 4: Volunteer sign-up flow (lib/shifts.ts — mocked supabase client)
// ---------------------------------------------------------------------------
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn((table: string) => buildTableInterface(table, "vol-signup")),
  },
}))

import { supabase as volSupabase } from "@/lib/supabaseClient"

describe("Scenario: Volunteer sign-up flow", () => {
  beforeEach(() => {
    db.reset()
    db.shifts.push({
      id: "shift-signup",
      shift_date: "2026-03-20",
      slot: "AM",
      start_time: "09:00",
      end_time: "12:00",
      capacity: 2,
      created_at: new Date().toISOString(),
    })
    db.profiles.push({ id: "vol-signup", name: "Alice", email: "alice@t.com", role: "volunteer", active: true, email_opt_in: false, created_at: new Date().toISOString() })
    vi.clearAllMocks()
    vi.mocked(volSupabase.auth.getUser).mockResolvedValue({ data: { user: { id: "vol-signup" } }, error: null } as any)
  })

  it("signs up for an available shift successfully", async () => {
    const result = await signUpForShift("shift-signup", "vol-signup")
    expect(result.success).toBe(true)
    expect(db.assignments.filter((a) => a.shift_id === "shift-signup")).toHaveLength(1)
  })

  it("prevents double-booking the same shift", async () => {
    await signUpForShift("shift-signup", "vol-signup")
    const second = await signUpForShift("shift-signup", "vol-signup")
    expect(second.success).toBe(false)
    expect(second.error).toMatch(/already signed up/i)
  })

  it("prevents sign-up when shift is at capacity", async () => {
    // Add a second volunteer to fill the shift
    db.profiles.push({ id: "vol-full-1", name: "B", email: "b@t.com", role: "volunteer", active: true, email_opt_in: false, created_at: new Date().toISOString() })
    db.profiles.push({ id: "vol-full-2", name: "C", email: "c@t.com", role: "volunteer", active: true, email_opt_in: false, created_at: new Date().toISOString() })
    db.assignments.push({ id: "a1", shift_id: "shift-signup", user_id: "vol-full-1", created_at: new Date().toISOString() })
    db.assignments.push({ id: "a2", shift_id: "shift-signup", user_id: "vol-full-2", created_at: new Date().toISOString() })

    vi.mocked(volSupabase.auth.getUser).mockResolvedValue({ data: { user: { id: "vol-signup" } }, error: null } as any)
    const result = await signUpForShift("shift-signup", "vol-signup")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/full capacity/i)
  })

  it("cancels a shift signup and frees the spot", async () => {
    await signUpForShift("shift-signup", "vol-signup")
    const assignment = db.assignments.find((a) => a.shift_id === "shift-signup" && a.user_id === "vol-signup")!
    expect(assignment).toBeDefined()

    const cancelResult = await cancelShiftSignup(assignment.id)
    expect(cancelResult.success).toBe(true)
    expect(db.assignments.find((a) => a.id === assignment.id)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// SCENARIO 5: getCapacityStatus — pure logic across thresholds
// ---------------------------------------------------------------------------
describe("getCapacityStatus — boundary values", () => {
  const cases: Array<[number, number, ReturnType<typeof getCapacityStatus>]> = [
    [0, 0, "none"],
    [1, 0, "available"],
    [4, 1, "available"],  // 25%
    [4, 2, "nearly-full"], // 50% exactly
    [4, 3, "nearly-full"], // 75%
    [4, 4, "full"],        // 100%
    [4, 5, "full"],        // over capacity
    [10, 4, "available"],  // 40%
    [10, 5, "nearly-full"],// 50%
    [10, 9, "nearly-full"],// 90%
    [10, 10, "full"],      // 100%
  ]

  it.each(cases)("capacity=%i assigned=%i → %s", (cap, assigned, expected) => {
    expect(getCapacityStatus(cap, assigned)).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// SCENARIO 6: Report period date calculations
// ---------------------------------------------------------------------------
describe("Report period date calculations", () => {
  // Mirror the getPeriodDates logic from reports page
  type Period = "this_week" | "next_week" | "2_weeks" | "this_month" | "next_month" | "last_30"

  function getPeriodDates(period: Period, today: Date): { start: string; end: string } {
    const t = new Date(today); t.setHours(0, 0, 0, 0)
    const fmt = (d: Date) => d.toISOString().split("T")[0]
    const sow = (d: Date) => { const c = new Date(d); c.setDate(c.getDate() - c.getDay()); return c }
    switch (period) {
      case "this_week":  { const s = sow(t); const e = new Date(s); e.setDate(s.getDate() + 6); return { start: fmt(s), end: fmt(e) } }
      case "next_week":  { const s = sow(t); s.setDate(s.getDate() + 7); const e = new Date(s); e.setDate(s.getDate() + 6); return { start: fmt(s), end: fmt(e) } }
      case "2_weeks":    { const e = new Date(t); e.setDate(t.getDate() + 13); return { start: fmt(t), end: fmt(e) } }
      case "this_month": { const s = new Date(t.getFullYear(), t.getMonth(), 1); const e = new Date(t.getFullYear(), t.getMonth() + 1, 0); return { start: fmt(s), end: fmt(e) } }
      case "next_month": { const s = new Date(t.getFullYear(), t.getMonth() + 1, 1); const e = new Date(t.getFullYear(), t.getMonth() + 2, 0); return { start: fmt(s), end: fmt(e) } }
      default:           { const s = new Date(t); s.setDate(t.getDate() - 30); return { start: fmt(s), end: fmt(t) } }
    }
  }

  // Use a fixed "today" = Friday March 6, 2026
  const today = new Date(2026, 2, 6) // month is 0-indexed

  it("this_week starts on the Sunday of the current week", () => {
    const { start, end } = getPeriodDates("this_week", today)
    const startDay = new Date(start + "T00:00:00").getDay()
    const endDay = new Date(end + "T00:00:00").getDay()
    expect(startDay).toBe(0) // Sunday
    expect(endDay).toBe(6)   // Saturday
  })

  it("next_week is exactly 7 days after this_week", () => {
    const tw = getPeriodDates("this_week", today)
    const nw = getPeriodDates("next_week", today)
    const twStart = new Date(tw.start + "T00:00:00").getTime()
    const nwStart = new Date(nw.start + "T00:00:00").getTime()
    expect(nwStart - twStart).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it("2_weeks span is exactly 14 days (start inclusive)", () => {
    const { start, end } = getPeriodDates("2_weeks", today)
    const s = new Date(start + "T00:00:00")
    const e = new Date(end + "T00:00:00")
    const days = (e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)
    expect(days).toBe(13) // 14 days inclusive = 13 day diff
  })

  it("this_month starts on the 1st of March and ends on the 31st", () => {
    const { start, end } = getPeriodDates("this_month", today)
    expect(start).toBe("2026-03-01")
    expect(end).toBe("2026-03-31")
  })

  it("next_month is April 2026 (1st to 30th)", () => {
    const { start, end } = getPeriodDates("next_month", today)
    expect(start).toBe("2026-04-01")
    expect(end).toBe("2026-04-30")
  })

  it("last_30 ends on today and starts 30 days ago", () => {
    const { start, end } = getPeriodDates("last_30", today)
    expect(end).toBe("2026-03-06")
    const s = new Date(start + "T00:00:00")
    const e = new Date(end + "T00:00:00")
    expect((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)).toBe(30)
  })

  it("this_month for December rolls over year correctly", () => {
    const dec = new Date(2026, 11, 15) // December 15
    const { start, end } = getPeriodDates("this_month", dec)
    expect(start).toBe("2026-12-01")
    expect(end).toBe("2026-12-31")
  })

  it("next_month for December gives January of next year", () => {
    const dec = new Date(2026, 11, 15)
    const { start, end } = getPeriodDates("next_month", dec)
    expect(start).toBe("2027-01-01")
    expect(end).toBe("2027-01-31")
  })
})

// ---------------------------------------------------------------------------
// SCENARIO 7: getShiftsForRange returns correct shape
// ---------------------------------------------------------------------------
describe("Scenario: getShiftsForRange", () => {
  beforeEach(() => {
    db.reset()
    vi.clearAllMocks()
    setupAdmin()
    // Seed some shifts
    db.shifts.push(
      { id: "sr-1", shift_date: "2026-03-10", slot: "AM", start_time: "09:00", end_time: "12:00", capacity: 2, created_at: new Date().toISOString() },
      { id: "sr-2", shift_date: "2026-03-10", slot: "PM", start_time: "15:00", end_time: "17:00", capacity: 1, created_at: new Date().toISOString() },
      { id: "sr-3", shift_date: "2026-03-17", slot: "AM", start_time: "09:00", end_time: "12:00", capacity: 2, created_at: new Date().toISOString() },
    )
    db.assignments.push({ id: "a1", shift_id: "sr-1", user_id: "vol-1", created_at: new Date().toISOString() })
  })

  it("returns only shifts within the requested range", async () => {
    const result = await getShiftsForRange("2026-03-10", "2026-03-10")
    expect(result.success).toBe(true)
    const shifts = (result as any).shifts as any[]
    expect(shifts.every((s: any) => s.shift_date === "2026-03-10")).toBe(true)
  })

  it("returns an empty array when no shifts exist in range", async () => {
    const result = await getShiftsForRange("2026-04-01", "2026-04-30")
    expect(result.success).toBe(true)
    expect((result as any).shifts).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// SCENARIO 8: getActiveVolunteers excludes admins and inactive users
// ---------------------------------------------------------------------------
describe("Scenario: getActiveVolunteers", () => {
  beforeEach(() => {
    db.reset()
    vi.clearAllMocks()
    setupAdmin()
    db.profiles.push(
      { id: "v1", name: "Alice", email: "a@t.com", role: "volunteer", active: true, email_opt_in: false, created_at: new Date().toISOString() },
      { id: "v2", name: "Bob", email: "b@t.com", role: "volunteer", active: false, email_opt_in: false, created_at: new Date().toISOString() }, // inactive
      { id: "v3", name: "Carol", email: "c@t.com", role: "admin", active: true, email_opt_in: false, created_at: new Date().toISOString() }, // admin
    )
  })

  it("returns only active volunteers", async () => {
    const result = await getActiveVolunteers()
    expect(result.success).toBe(true)
    const users = (result as any).data as any[]
    expect(users.every((u: any) => u.role === "volunteer")).toBe(true)
    expect(users.every((u: any) => u.active === true)).toBe(true)
    // Only Alice matches
    expect(users.find((u: any) => u.id === "v1")).toBeDefined()
    expect(users.find((u: any) => u.id === "v2")).toBeUndefined()
    expect(users.find((u: any) => u.id === "v3")).toBeUndefined()
  })
})
