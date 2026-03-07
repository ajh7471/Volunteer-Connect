/**
 * Unit tests for lib/shifts.ts
 *
 * Pure functions are tested directly.
 * Functions that call Supabase are tested with a mock that correctly
 * simulates the builder chain (select → eq → gte → lte resolves).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock supabaseClient BEFORE importing lib/shifts ─────────────────────────
// The chain must resolve at `lte` (the final call in the range query).
// Single-result calls resolve at `.single()`.

const SHIFTS_FIXTURE = [
  { id: "s1", shift_date: "2026-03-06", slot: "AM", start_time: "09:00", end_time: "12:00" }, // Fri
  { id: "s2", shift_date: "2026-03-13", slot: "AM", start_time: "09:00", end_time: "12:00" }, // Fri +1w
  { id: "s3", shift_date: "2026-03-20", slot: "AM", start_time: "09:00", end_time: "12:00" }, // Fri +2w
  { id: "s4", shift_date: "2026-03-27", slot: "AM", start_time: "09:00", end_time: "12:00" }, // Fri +3w
  { id: "s5", shift_date: "2026-03-07", slot: "AM", start_time: "09:00", end_time: "12:00" }, // Sat
]

// We track call count to distinguish: first from() = originalShift, second = range query
let fromCallCount = 0

vi.mock("@/lib/supabaseClient", () => {
  return {
    supabase: {
      from: vi.fn(() => {
        fromCallCount++
        const isFirst = fromCallCount === 1

        // Terminal `.then` makes the chain itself a thenable (awaitable)
        const chain: any = {}
        chain.select = vi.fn(() => chain)
        chain.eq = vi.fn(() => chain)
        chain.gte = vi.fn(() => chain)
        chain.order = vi.fn(() => chain)
        chain.single = vi.fn(() =>
          Promise.resolve({ data: SHIFTS_FIXTURE[0], error: null })
        )
        chain.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: null, error: null })
        )
        // lte is the last call in the range chain — resolves with fixture data
        chain.lte = vi.fn(() =>
          Promise.resolve(
            isFirst
              ? { data: SHIFTS_FIXTURE[0], error: null }
              : { data: SHIFTS_FIXTURE, error: null }
          )
        )
        chain.in = vi.fn(() =>
          Promise.resolve({ data: [], error: null })
        )
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

// Reset call counter before each test that uses findMatchingShifts
beforeEach(() => {
  fromCallCount = 0
})

// ─── getCapacityStatus — pure, no DB ─────────────────────────────────────────
describe("getCapacityStatus", () => {
  it("returns 'none' when capacity is 0", () => {
    expect(getCapacityStatus(0, 0)).toBe("none")
  })

  it("returns 'available' when shift is empty", () => {
    expect(getCapacityStatus(2, 0)).toBe("available")
  })

  it("returns 'available' when below 50% filled (1/4)", () => {
    expect(getCapacityStatus(4, 1)).toBe("available")
  })

  it("returns 'nearly-full' at exactly 50% filled (1/2)", () => {
    expect(getCapacityStatus(2, 1)).toBe("nearly-full")
  })

  it("returns 'nearly-full' between 50% and 99% filled (3/4)", () => {
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

// ─── findMatchingShifts — weekly filter ───────────────────────────────────────
describe("findMatchingShifts — weekly recurrence", () => {
  it("excludes Saturday shifts when original is a Friday", async () => {
    const result = await findMatchingShifts("s1", "2026-03-06", "2026-03-31", "weekly")
    const saturdays = result.filter((s) => new Date(s.shift_date + "T00:00:00").getDay() === 6)
    expect(saturdays).toHaveLength(0)
  })

  it("includes only same day-of-week (Friday) shifts", async () => {
    const result = await findMatchingShifts("s1", "2026-03-06", "2026-03-31", "weekly")
    result.forEach((s) => {
      const dow = new Date(s.shift_date + "T00:00:00").getDay()
      expect(dow).toBe(5) // Friday
    })
  })
})

describe("findMatchingShifts — daily recurrence", () => {
  it("returns all shifts in the range for daily recurrence", async () => {
    const result = await findMatchingShifts("s1", "2026-03-06", "2026-03-31", "daily")
    expect(result.length).toBeGreaterThan(0)
  })
})

describe("findMatchingShifts — biweekly recurrence", () => {
  it("includes the original shift date (diff = 0 weeks, even)", async () => {
    const result = await findMatchingShifts("s1", "2026-03-06", "2026-03-31", "biweekly")
    const ids = result.map((s) => s.id)
    // s1 and s3 are exactly 0 and 2 weeks from s1
    expect(ids).toContain("s1")
    expect(ids).toContain("s3")
  })

  it("excludes odd-week Fridays (1 week, 3 weeks out)", async () => {
    const result = await findMatchingShifts("s1", "2026-03-06", "2026-03-31", "biweekly")
    const ids = result.map((s) => s.id)
    expect(ids).not.toContain("s2") // 1 week out
    expect(ids).not.toContain("s4") // 3 weeks out
  })
})

describe("findMatchingShifts — monthly recurrence", () => {
  it("returns shifts on the same day of month", async () => {
    const result = await findMatchingShifts("s1", "2026-03-06", "2026-03-31", "monthly")
    result.forEach((s) => {
      const d = new Date(s.shift_date + "T00:00:00")
      expect(d.getDate()).toBe(6)
    })
  })
})
