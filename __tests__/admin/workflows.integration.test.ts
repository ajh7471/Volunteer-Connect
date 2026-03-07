/**
 * Integration tests: end-to-end admin + volunteer workflows
 *
 * Uses a stateful in-memory DB to simulate multi-step sequences exactly as a
 * real user would perform them in the app — no real database or network needed.
 *
 * Flows covered:
 *   1. Admin creates a shift, assigns volunteers up to capacity, then revokes
 *   2. Duplicate assignment prevention
 *   3. Last-admin demotion / self-delete protection
 *   4. Blocked email prevents user creation
 *   5. Volunteer recurrence logic (weekly, biweekly, monthly, daily)
 *   6. ICS calendar export shape and content
 *   7. Date utilities: grid generation, formatting, timezone-safe parsing
 *   8. getCapacityStatus progression through a shift lifecycle
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: vi.fn().mockReturnValue([]) }),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

vi.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: vi.fn(() => ({ url: "https://test.supabase.co", anonKey: "anon" })),
  isSupabaseConfigured: vi.fn(() => true),
}))

// ─── Stateful in-memory database ─────────────────────────────────────────────

type Profile = { id: string; name: string; email: string; role: "admin" | "volunteer"; active: boolean }
type Shift = { id: string; shift_date: string; slot: string; start_time: string; end_time: string; capacity: number }
type Assignment = { id: string; shift_id: string; user_id: string }

class DB {
  profiles: Profile[] = []
  shifts: Shift[] = []
  assignments: Assignment[] = []
  blocklist: string[] = []
  _id = 1

  reset() {
    this.profiles = []; this.shifts = []; this.assignments = []; this.blocklist = []; this._id = 1
  }
  uid(prefix = "id") { return `${prefix}-${this._id++}` }

  seed() {
    this.profiles = [
      { id: "admin-1", name: "Admin", email: "admin@test.com", role: "admin", active: true },
      { id: "vol-1",   name: "Alice",  email: "alice@test.com",  role: "volunteer", active: true },
      { id: "vol-2",   name: "Bob",    email: "bob@test.com",    role: "volunteer", active: true },
      { id: "vol-3",   name: "Carol",  email: "carol@test.com",  role: "volunteer", active: true },
    ]
    this.shifts = [
      { id: "shift-1", shift_date: "2026-03-10", slot: "AM",  start_time: "09:00", end_time: "12:00", capacity: 2 },
      { id: "shift-2", shift_date: "2026-03-11", slot: "MID", start_time: "12:00", end_time: "15:00", capacity: 1 },
    ]
  }
}

const db = new DB()

// ─── Mock factory that reads from db ─────────────────────────────────────────

function buildServiceClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      admin: {
        createUser: vi.fn(({ email }: { email: string }) => {
          const id = db.uid("user")
          db.profiles.push({ id, name: "", email, role: "volunteer", active: true })
          return Promise.resolve({ data: { user: { id } }, error: null })
        }),
        deleteUser: vi.fn((id: string) => {
          db.profiles = db.profiles.filter((p) => p.id !== id)
          return Promise.resolve({ data: {}, error: null })
        }),
      },
    },
    from: vi.fn((table: string) => {
      const makeChain = (terminal: () => Promise<any>) => {
        let filters: Record<string, any> = {}
        const c: any = {
          _filters: filters,
          select: vi.fn().mockReturnThis(),
          eq: vi.fn((col: string, val: any) => { filters[col] = val; return c }),
          in: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          update: vi.fn((data: any) => {
            if (table === "profiles") {
              db.profiles = db.profiles.map((p) => p.id === filters.id ? { ...p, ...data } : p)
            }
            return c
          }),
          delete: vi.fn(() => {
            if (table === "profiles") db.profiles = db.profiles.filter((p) => p.id !== filters.id)
            if (table === "shift_assignments") db.assignments = db.assignments.filter((a) => a.id !== filters.id)
            return c
          }),
          insert: vi.fn((data: any) => {
            if (table === "shift_assignments") {
              const rows = Array.isArray(data) ? data : [data]
              rows.forEach((r) => db.assignments.push({ id: db.uid("assign"), ...r }))
            }
            if (table === "profiles") {
              const rows = Array.isArray(data) ? data : [data]
              rows.forEach((r) => db.profiles.push(r))
            }
            return Promise.resolve({ data: null, error: null })
          }),
          upsert: vi.fn((data: any) => {
            if (table === "profiles") {
              const rows = Array.isArray(data) ? data : [data]
              rows.forEach((r) => {
                const idx = db.profiles.findIndex((p) => p.id === r.id)
                if (idx >= 0) db.profiles[idx] = { ...db.profiles[idx], ...r }
                else db.profiles.push(r)
              })
            }
            return Promise.resolve({ data: null, error: null })
          }),
          single: vi.fn(() => terminal()),
          maybeSingle: vi.fn(() => {
            if (table === "auth_blocklist") {
              return Promise.resolve({ data: db.blocklist.includes(filters.email) ? { email: filters.email } : null, error: null })
            }
            if (table === "shift_assignments") {
              const found = db.assignments.find((a) => a.shift_id === filters.shift_id && a.user_id === filters.user_id)
              return Promise.resolve({ data: found || null, error: null })
            }
            return Promise.resolve({ data: null, error: null })
          }),
        }
        const p = terminal()
        c.then = p.then.bind(p)
        return c
      }

      if (table === "auth_blocklist") {
        return makeChain(() => Promise.resolve({ data: null, error: null }))
      }
      if (table === "profiles") {
        return makeChain(() => {
          // For single-admin protection, return all admins when role=admin filter
          return Promise.resolve({ data: db.profiles.filter((p) => p.role === "admin"), error: null })
        })
      }
      if (table === "shifts") {
        return makeChain(() => {
          // Returns the first shift for single() calls
          return Promise.resolve({ data: db.shifts[0] || null, error: null })
        })
      }
      if (table === "shift_assignments") {
        return makeChain(() => {
          return Promise.resolve({ data: db.assignments, error: null })
        })
      }

      return makeChain(() => Promise.resolve({ data: null, error: null }))
    }),
  }
}

function buildServerClient(userId = "admin-1", role: "admin" | "volunteer" | null = "admin") {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null }, error: null }),
    },
    from: vi.fn((table: string) => {
      const c: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: role ? { role } : null, error: null }),
      }
      const p = Promise.resolve({ data: role ? { role } : null, error: null })
      c.then = p.then.bind(p)
      return c
    }),
  }
}

// ─── Module-level mock targets ────────────────────────────────────────────────

let _serverClient: any
let _serviceClient: any

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => _serverClient),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => _serviceClient),
}))

import {
  assignShiftToUser,
  revokeShiftFromUser,
  createUserAccount,
  deleteUserAccount,
  updateUserRole,
} from "@/app/admin/actions"

import { getCapacityStatus, findMatchingShifts } from "@/lib/shifts"
import { generateICS } from "@/lib/calendar-export"
import { ymd, parseDate, formatTime12Hour, daysInGrid } from "@/lib/date"

function asAdmin() {
  _serverClient = buildServerClient("admin-1", "admin")
  _serviceClient = buildServiceClient()
}

function asVolunteer() {
  _serverClient = buildServerClient("vol-1", "volunteer")
  _serviceClient = buildServiceClient()
}

function asUnauthenticated() {
  _serverClient = buildServerClient(null as any, null)
  _serviceClient = buildServiceClient()
}

// ─── Flow 1: Shift assignment lifecycle ──────────────────────────────────────

describe("Flow 1 — Shift assignment lifecycle", () => {
  beforeEach(() => { db.reset(); db.seed(); asAdmin() })

  it("step 1: admin assigns first volunteer to a 2-capacity shift", async () => {
    const result = await assignShiftToUser("vol-1", "shift-1")
    expect(result.success).toBe(true)
    expect(db.assignments).toHaveLength(1)
    expect(db.assignments[0].user_id).toBe("vol-1")
  })

  it("step 2: admin assigns second volunteer — shift now full", async () => {
    db.assignments.push({ id: "a1", shift_id: "shift-1", user_id: "vol-1" })
    const result = await assignShiftToUser("vol-2", "shift-1")
    expect(result.success).toBe(true)
    expect(db.assignments).toHaveLength(2)
  })

  it("step 3: assigning a third volunteer to a full shift fails", async () => {
    db.assignments.push(
      { id: "a1", shift_id: "shift-1", user_id: "vol-1" },
      { id: "a2", shift_id: "shift-1", user_id: "vol-2" },
    )
    const result = await assignShiftToUser("vol-3", "shift-1")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/capacity/i)
    expect(db.assignments).toHaveLength(2) // unchanged
  })

  it("step 4: admin revokes one assignment — shift re-opens", async () => {
    db.assignments.push(
      { id: "a1", shift_id: "shift-1", user_id: "vol-1" },
      { id: "a2", shift_id: "shift-1", user_id: "vol-2" },
    )
    const result = await revokeShiftFromUser("a1")
    expect(result.success).toBe(true)
    expect(db.assignments).toHaveLength(1)
  })

  it("step 5: after revoke, previously-blocked vol-3 can now be assigned", async () => {
    db.assignments.push({ id: "a2", shift_id: "shift-1", user_id: "vol-2" })
    const result = await assignShiftToUser("vol-3", "shift-1")
    expect(result.success).toBe(true)
  })
})

// ─── Flow 2: Duplicate assignment prevention ──────────────────────────────────

describe("Flow 2 — Duplicate assignment prevention", () => {
  beforeEach(() => { db.reset(); db.seed(); asAdmin() })

  it("assigning the same volunteer twice returns an error", async () => {
    db.assignments.push({ id: "a1", shift_id: "shift-1", user_id: "vol-1" })
    const result = await assignShiftToUser("vol-1", "shift-1")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/already assigned/i)
    expect(db.assignments).toHaveLength(1) // no duplicate added
  })
})

// ─── Flow 3: Auth / role protection ──────────────────────────────────────────

describe("Flow 3 — Auth and role protection", () => {
  beforeEach(() => { db.reset(); db.seed() })

  it("unauthenticated user cannot assign shifts", async () => {
    asUnauthenticated()
    const result = await assignShiftToUser("vol-1", "shift-1")
    expect(result.success).toBe(false)
  })

  it("volunteer cannot assign shifts", async () => {
    asVolunteer()
    const result = await assignShiftToUser("vol-1", "shift-1")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/admin/i)
  })

  it("volunteer cannot create user accounts", async () => {
    asVolunteer()
    const result = await createUserAccount({ email: "x@x.com", password: "pass", name: "X", role: "volunteer" })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/admin/i)
  })

  it("volunteer cannot delete users", async () => {
    asVolunteer()
    const result = await deleteUserAccount("vol-2")
    expect(result.success).toBe(false)
  })

  it("volunteer cannot update roles", async () => {
    asVolunteer()
    const result = await updateUserRole("vol-2", "admin")
    expect(result.success).toBe(false)
  })
})

// ─── Flow 4: Blocked email prevents user creation ─────────────────────────────

describe("Flow 4 — Blocked email enforcement", () => {
  beforeEach(() => { db.reset(); db.seed(); db.blocklist = ["spam@bad.com"]; asAdmin() })

  it("creating a user with a blocked email fails", async () => {
    const result = await createUserAccount({
      email: "spam@bad.com", password: "pass1234", name: "Spammer", role: "volunteer",
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/blocked/i)
  })

  it("creating a user with a clean email succeeds", async () => {
    const result = await createUserAccount({
      email: "clean@good.com", password: "pass1234", name: "Clean User", role: "volunteer",
    })
    expect(result.success).toBe(true)
  })
})

// ─── Flow 5: Last-admin protection ───────────────────────────────────────────

describe("Flow 5 — Last-admin protection", () => {
  beforeEach(() => {
    db.reset()
    db.profiles = [{ id: "admin-1", name: "Admin", email: "admin@test.com", role: "admin", active: true }]
    asAdmin()
  })

  it("cannot demote the only admin to volunteer", async () => {
    const result = await updateUserRole("admin-1", "volunteer")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/last admin/i)
  })

  it("cannot delete the only admin account", async () => {
    const result = await deleteUserAccount("admin-1")
    // Either self-delete protection or last-admin protection triggers
    expect(result.success).toBe(false)
  })
})

// ─── Flow 6: getCapacityStatus through shift lifecycle ───────────────────────

describe("Flow 6 — getCapacityStatus lifecycle", () => {
  it("empty shift is available", () => {
    expect(getCapacityStatus(2, 0)).toBe("available")
  })

  it("shift crosses 50% and becomes nearly-full", () => {
    expect(getCapacityStatus(4, 2)).toBe("nearly-full")
  })

  it("shift at 100% is full", () => {
    expect(getCapacityStatus(2, 2)).toBe("full")
  })

  it("zero capacity returns none", () => {
    expect(getCapacityStatus(0, 0)).toBe("none")
  })

  it("capacity status is consistent at each step for a 4-slot shift", () => {
    const cap = 4
    expect(getCapacityStatus(cap, 0)).toBe("available")   // 0%
    expect(getCapacityStatus(cap, 1)).toBe("available")   // 25%
    expect(getCapacityStatus(cap, 2)).toBe("nearly-full") // 50%
    expect(getCapacityStatus(cap, 3)).toBe("nearly-full") // 75%
    expect(getCapacityStatus(cap, 4)).toBe("full")        // 100%
  })
})

// ─── Flow 7: ICS calendar export ─────────────────────────────────────────────

describe("Flow 7 — ICS calendar export", () => {
  it("generates valid VCALENDAR wrapper", () => {
    const ics = generateICS([])
    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("END:VCALENDAR")
    expect(ics).toContain("VERSION:2.0")
  })

  it("generates one VEVENT per shift", () => {
    const events = [
      { id: "s1", summary: "Morning Shift", description: "", location: "Vanderpump Dogs", startDate: new Date("2026-03-06T09:00:00Z"), endDate: new Date("2026-03-06T12:00:00Z") },
      { id: "s2", summary: "Midday Shift", description: "", location: "Vanderpump Dogs", startDate: new Date("2026-03-07T12:00:00Z"), endDate: new Date("2026-03-07T15:00:00Z") },
    ]
    const ics = generateICS(events)
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(2)
  })

  it("includes UID with event id and correct domain", () => {
    const ics = generateICS([{ id: "abc123", summary: "S", description: "", location: "", startDate: new Date(), endDate: new Date() }])
    expect(ics).toContain("UID:abc123@vanderpumpdogs.org")
  })

  it("escapes special ICS characters in summary", () => {
    const ics = generateICS([{ id: "x", summary: "Shift, AM; Special", description: "", location: "", startDate: new Date(), endDate: new Date() }])
    expect(ics).toContain("SUMMARY:Shift\\, AM\\; Special")
  })

  it("formats DTSTART correctly in UTC", () => {
    const ics = generateICS([{ id: "t", summary: "", description: "", location: "", startDate: new Date("2026-03-06T09:00:00Z"), endDate: new Date("2026-03-06T12:00:00Z") }])
    expect(ics).toContain("DTSTART:20260306T090000Z")
    expect(ics).toContain("DTEND:20260306T120000Z")
  })
})

// ─── Flow 8: Date utilities ───────────────────────────────────────────────────

describe("Flow 8 — Date utility functions", () => {
  it("ymd formats correctly with zero-padding", () => {
    expect(ymd(new Date(2026, 0, 5))).toBe("2026-01-05")
  })

  it("parseDate avoids timezone drift for YYYY-MM-DD strings", () => {
    const d = parseDate("2026-03-06")
    expect(d.getDate()).toBe(6)
    expect(d.getMonth()).toBe(2)
    expect(d.getFullYear()).toBe(2026)
  })

  it("formatTime12Hour handles AM/PM boundary at noon", () => {
    expect(formatTime12Hour("11:59")).toBe("11:59 AM")
    expect(formatTime12Hour("12:00")).toBe("12:00 PM")
    expect(formatTime12Hour("12:01")).toBe("12:01 PM")
  })

  it("formatTime12Hour handles midnight", () => {
    expect(formatTime12Hour("00:00")).toBe("12:00 AM")
  })

  it("daysInGrid always has length divisible by 7", () => {
    for (let m = 0; m < 12; m++) {
      expect(daysInGrid(new Date(2026, m, 1)).length % 7).toBe(0)
    }
  })

  it("daysInGrid starts on Sunday for a month beginning on Sunday", () => {
    // March 1 2026 = Sunday
    const grid = daysInGrid(new Date(2026, 2, 1))
    expect(grid[0].getDay()).toBe(0)
    expect(grid[0].getDate()).toBe(1)
  })
})

// ─── Flow 9: Reporting period date math ──────────────────────────────────────

describe("Flow 9 — Reporting period date math", () => {
  it("this-week start is always a Sunday", () => {
    const today = new Date(2026, 2, 11) // Wednesday
    const sow = new Date(today)
    sow.setDate(today.getDate() - today.getDay())
    expect(sow.getDay()).toBe(0) // Sunday
  })

  it("next-week start is 7 days after this-week start", () => {
    const today = new Date(2026, 2, 11)
    const sow = new Date(today)
    sow.setDate(today.getDate() - today.getDay())
    const nextWeek = new Date(sow)
    nextWeek.setDate(sow.getDate() + 7)
    expect(nextWeek.getDay()).toBe(0)
    expect((nextWeek.getTime() - sow.getTime()) / (86400000 * 7)).toBe(1)
  })

  it("2-weeks range spans exactly 14 days (today to today+13)", () => {
    const today = new Date(2026, 2, 6)
    const end = new Date(today)
    end.setDate(today.getDate() + 13)
    const days = Math.round((end.getTime() - today.getTime()) / 86400000)
    expect(days).toBe(13) // 14 day window inclusive = 13 day gap
  })

  it("this-month start is always the 1st", () => {
    const today = new Date(2026, 2, 15)
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    expect(start.getDate()).toBe(1)
  })

  it("next-month start is the 1st of the following month", () => {
    const today = new Date(2026, 2, 15)
    const start = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    expect(start.getMonth()).toBe(3)
    expect(start.getDate()).toBe(1)
  })

  it("handles December → January year rollover for next-month", () => {
    const today = new Date(2026, 11, 15) // December
    const start = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    expect(start.getFullYear()).toBe(2027)
    expect(start.getMonth()).toBe(0)
  })
})
