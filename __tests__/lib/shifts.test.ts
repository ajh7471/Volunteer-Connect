import { describe, it, expect, vi, beforeEach } from "vitest"
import { getCapacityStatus } from "@/lib/shifts"

// ---------------------------------------------------------------------------
// getCapacityStatus — pure function, no DB needed
// ---------------------------------------------------------------------------
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

  it("returns 'full' when at 100% capacity", () => {
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
})

// ---------------------------------------------------------------------------
// findMatchingShifts — logic layer (mocked supabase)
// ---------------------------------------------------------------------------
// We test the filtering logic by mocking the supabase client.

vi.mock("@/lib/supabaseClient", () => {
  const mockShifts = [
    { id: "s1", shift_date: "2026-03-06", slot: "AM", start_time: "09:00", end_time: "12:00" }, // Friday
    { id: "s2", shift_date: "2026-03-13", slot: "AM", start_time: "09:00", end_time: "12:00" }, // Friday +1 week
    { id: "s3", shift_date: "2026-03-20", slot: "AM", start_time: "09:00", end_time: "12:00" }, // Friday +2 weeks
    { id: "s4", shift_date: "2026-03-27", slot: "AM", start_time: "09:00", end_time: "12:00" }, // Friday +3 weeks
    { id: "s5", shift_date: "2026-03-07", slot: "AM", start_time: "09:00", end_time: "12:00" }, // Saturday
  ]

  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: "s1", shift_date: "2026-03-06", slot: "AM", start_time: "09:00", end_time: "12:00" },
      error: null,
    }),
    then: undefined,
  }

  // Second from().select() call returns all shifts
  let callCount = 0
  const fromFn = vi.fn(() => {
    callCount++
    if (callCount === 1) {
      // First call: fetch original shift
      return { ...mockChain, single: vi.fn().mockResolvedValue({ data: mockShifts[0], error: null }) }
    }
    // Second call: fetch matching shifts
    return {
      ...mockChain,
      lte: vi.fn().mockReturnThis(),
      then: undefined,
      // Return resolved promise with data
      [Symbol.asyncIterator]: undefined,
    }
  })

  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnValue(Promise.resolve({ data: mockShifts, error: null })),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockShifts[0], error: null }),
      })),
    },
  }
})

import { findMatchingShifts } from "@/lib/shifts"

describe("findMatchingShifts — weekly filter", () => {
  it("returns only shifts on the same day of week for weekly recurrence", async () => {
    const result = await findMatchingShifts("s1", "2026-03-06", "2026-03-31", "weekly")
    // All fridays in mock data: s1(Fri), s2(Fri+1), s3(Fri+2), s4(Fri+3)
    // s5 is Saturday — should be excluded
    const saturdays = result.filter((s) => {
      const d = new Date(s.shift_date + "T00:00:00")
      return d.getDay() === 6
    })
    expect(saturdays).toHaveLength(0)
  })

  it("returns all shifts for daily recurrence", async () => {
    const result = await findMatchingShifts("s1", "2026-03-06", "2026-03-31", "daily")
    expect(result.length).toBeGreaterThan(0)
  })
})
