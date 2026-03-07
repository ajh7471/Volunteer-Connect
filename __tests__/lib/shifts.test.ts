/**
 * Unit tests for lib/shifts.ts
 *
 * Pure functions are tested directly.
 * DB-dependent functions use a mock supabaseClient that correctly
 * replicates the query builder chain used in the actual code.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ORIGINAL = { id: "s1", shift_date: "2026-03-06", slot: "AM", start_time: "09:00", end_time: "12:00" }

const RANGE_DATA = [
  { id: "s1", shift_date: "2026-03-06", slot: "AM" }, // Fri  week 0
  { id: "s2", shift_date: "2026-03-13", slot: "AM" }, // Fri  week 1
  { id: "s3", shift_date: "2026-03-20", slot: "AM" }, // Fri  week 2
  { id: "s4", shift_date: "2026-03-27", slot: "AM" }, // Fri  week 3
  { id: "s5", shift_date: "2026-03-07", slot: "AM" }, // Sat  week 0 — different DOW
]

// ─── Mock @/lib/supabaseClient ────────────────────────────────────────────────
//
// findMatchingShifts makes TWO sequential calls:
//   1st: .from("shifts").select(...).eq("id",...).single()         → original shift
//   2nd: .from("shifts").select(...).eq(...).eq(...).eq(...).gte(...).lte(...).order(...)  → range
//
// We use a call-count to distinguish them.

let fromCallCount = 0

vi.mock("@/lib/supabaseClient", () => {
  return {
    supabase: {
      from: vi.fn(() => {
        fromCallCount++
        const callIndex = fromCallCount

        const chain: any = {}

        chain.select    = vi.fn().mockReturnThis()
        chain.eq        = vi.fn().mockReturnThis()
        chain.gte       = vi.fn().mockReturnThis()
        chain.lte       = vi.fn().mockReturnThis()
        chain.in        = vi.fn().mockReturnThis()
        chain.order     = vi.fn(() => {
          // Second from() call: range query — terminal is order()
          return Promise.resolve({ data: RANGE_DATA, error: null })
        })
        chain.single    = vi.fn(() => {
          // First from() call: fetch original shift
          return Promise.resolve({ data: ORIGINAL, error: null })
        })
        chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
        chain.delete    = vi.fn().mockReturnThis()
        chain.insert    = vi.fn(() => Promise.resolve({ data: null, error: null }))
        chain.count     = vi.fn().mockReturnThis()

        // Make the chain itself awaitable for calls that do `await supabase.from(...).select(...)`
        // (used by getMonthShifts and signUpForShift capacity check)
        const resolved = Promise.resolve(
          callIndex === 1
            ? { data: ORIGINAL, error: null }
            : { data: RANGE_DATA, error: null, count: 0 }
        )
        chain.then = resolved.then.bind(resolved)

        return chain
      }),
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: { id: "user-1" } }, error: null })
        ),
      },
    },
  }
})

import { getCapacityStatus, findMatchingShifts } from "@/lib/shifts"

beforeEach(() => { fromCallCount = 0 })

// ─── getCapacityStatus — pure, no DB ─────────────────────────────────────────

describe("getCapacityStatus", () => {
  it("returns 'none' when capacity is 0", () => {
    expect(getCapacityStatus(0, 0)).toBe("none")
  })

  it("returns 'available' when shift is empty", () => {
    expect(getCapacityStatus(2, 0)).toBe("available")
  })

  it("returns 'available' when below 50% filled", () => {
    expect(getCapacityStatus(4, 1)).toBe("available")
  })

  it("returns 'nearly-full' at exactly 50% filled", () => {
    expect(getCapacityStatus(2, 1)).toBe("nearly-full")
  })

  it("returns 'nearly-full' between 50% and 99% filled", () => {
    expect(getCapacityStatus(4, 3)).toBe("nearly-full")
  })

  it("returns 'full' when at exactly 100% capacity", () => {
    expect(getCapacityStatus(2, 2)).toBe("full")
  })

  it("returns 'full' when over capacity (guard case)", () => {
    expect(getCapacityStatus(2, 3)).toBe("full")
  })

  it("returns 'available' for a single-slot shift with 0 assigned", () => {
    expect(getCapacityStatus(1, 0)).toBe("available")
  })

  it("returns 'full' for a single-slot shift fully assigned", () => {
    expect(getCapacityStatus(1, 1)).toBe("full")
  })

  it("handles large capacity values correctly", () => {
    expect(getCapacityStatus(100, 49)).toBe("available")
    expect(getCapacityStatus(100, 50)).toBe("nearly-full")
    expect(getCapacityStatus(100, 100)).toBe("full")
  })
})

// ─── findMatchingShifts — recurrence filters ─────────────────────────────────

describe("findMatchingShifts — weekly recurrence", () => {
  it("excludes Saturday shifts when original is a Friday", async () => {
    const result = await findMatchingShifts("s1", "2026-03-06", "2026-03-31", "weekly")
    const saturdays = result.filter((s) => new Date(s.shift_date + "T00:00:00").getDay() === 6)
    expect(saturdays).toHaveLength(0)
  })

  it("includes only same day-of-week (Friday) shifts", async () => {
    const result = await findMatchingShifts("s1", "2026-03-06", "2026-03-31", "weekly")
    result.forEach((s) => {
      expect(new Date(s.shift_date + "T00:00:00").getDay()).toBe(5)
    })
  })
})

describe("findMatchingShifts — daily recurrence", () => {
  it("returns all shifts in the range", async () => {
    const result = await findMatchingShifts("s1", "2026-03-06", "2026-03-31", "daily")
    expect(result.length).toBeGreaterThan(0)
  })
})

describe("findMatchingShifts — biweekly recurrence", () => {
  it("includes even-week Fridays (week 0 and 2)", async () => {
    const result = await findMatchingShifts("s1", "2026-03-06", "2026-03-31", "biweekly")
    const ids = result.map((s) => s.id)
    expect(ids).toContain("s1")
    expect(ids).toContain("s3")
  })

  it("excludes odd-week Fridays (week 1 and 3)", async () => {
    const result = await findMatchingShifts("s1", "2026-03-06", "2026-03-31", "biweekly")
    const ids = result.map((s) => s.id)
    expect(ids).not.toContain("s2")
    expect(ids).not.toContain("s4")
  })
})

describe("findMatchingShifts — monthly recurrence", () => {
  it("returns only shifts on the same day of month (6th)", async () => {
    const result = await findMatchingShifts("s1", "2026-03-06", "2026-03-31", "monthly")
    result.forEach((s) => {
      expect(new Date(s.shift_date + "T00:00:00").getDate()).toBe(6)
    })
  })
})
