import { describe, it, expect } from "vitest"
import {
  startOfMonth,
  endOfMonth,
  ymd,
  addMonths,
  daysInGrid,
  isSameMonth,
  isSameDay,
  parseDate,
  formatDateForDisplay,
  formatTime12Hour,
} from "@/lib/date"

// ---------------------------------------------------------------------------
// startOfMonth
// ---------------------------------------------------------------------------
describe("startOfMonth", () => {
  it("returns the first day of the given month", () => {
    const result = startOfMonth(new Date(2026, 2, 15)) // March 15
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(2)
    expect(result.getDate()).toBe(1)
  })

  it("uses today by default and returns day 1", () => {
    const result = startOfMonth()
    expect(result.getDate()).toBe(1)
  })

  it("handles January correctly (no month underflow)", () => {
    const result = startOfMonth(new Date(2026, 0, 20))
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// endOfMonth
// ---------------------------------------------------------------------------
describe("endOfMonth", () => {
  it("returns last day of March (31)", () => {
    const result = endOfMonth(new Date(2026, 2, 1))
    expect(result.getDate()).toBe(31)
    expect(result.getMonth()).toBe(2)
  })

  it("returns last day of February in a non-leap year (28)", () => {
    const result = endOfMonth(new Date(2025, 1, 1))
    expect(result.getDate()).toBe(28)
  })

  it("returns last day of February in a leap year (29)", () => {
    const result = endOfMonth(new Date(2024, 1, 1))
    expect(result.getDate()).toBe(29)
  })

  it("returns 30 for April", () => {
    const result = endOfMonth(new Date(2026, 3, 10))
    expect(result.getDate()).toBe(30)
  })
})

// ---------------------------------------------------------------------------
// ymd
// ---------------------------------------------------------------------------
describe("ymd", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(ymd(new Date(2026, 2, 6))).toBe("2026-03-06")
  })

  it("zero-pads single-digit months and days", () => {
    expect(ymd(new Date(2026, 0, 9))).toBe("2026-01-09")
  })

  it("handles December correctly", () => {
    expect(ymd(new Date(2026, 11, 31))).toBe("2026-12-31")
  })
})

// ---------------------------------------------------------------------------
// addMonths
// ---------------------------------------------------------------------------
describe("addMonths", () => {
  it("adds positive months", () => {
    const result = addMonths(new Date(2026, 0, 15), 2)
    expect(result.getMonth()).toBe(2)
    expect(result.getFullYear()).toBe(2026)
  })

  it("rolls over year boundary", () => {
    const result = addMonths(new Date(2026, 11, 1), 1)
    expect(result.getMonth()).toBe(0)
    expect(result.getFullYear()).toBe(2027)
  })

  it("handles negative months (going back)", () => {
    const result = addMonths(new Date(2026, 2, 1), -3)
    expect(result.getMonth()).toBe(11)
    expect(result.getFullYear()).toBe(2025)
  })

  it("returns the 1st of the resulting month", () => {
    const result = addMonths(new Date(2026, 5, 20), 1)
    expect(result.getDate()).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// daysInGrid
// ---------------------------------------------------------------------------
describe("daysInGrid", () => {
  it("always returns a length divisible by 7", () => {
    for (let month = 0; month < 12; month++) {
      const grid = daysInGrid(new Date(2026, month, 1))
      expect(grid.length % 7).toBe(0)
    }
  })

  it("includes all days of the month", () => {
    const grid = daysInGrid(new Date(2026, 2, 1)) // March 2026
    const marchDays = grid.filter((d) => d.getMonth() === 2 && d.getFullYear() === 2026)
    expect(marchDays).toHaveLength(31)
  })

  it("starts on Sunday (index 0 = Sun) for a month that starts on Sunday", () => {
    // March 1 2026 is a Sunday
    const grid = daysInGrid(new Date(2026, 2, 1))
    expect(grid[0].getDate()).toBe(1)
    expect(grid[0].getMonth()).toBe(2)
  })

  it("fills leading days from previous month for months not starting on Sunday", () => {
    // April 1 2026 is a Wednesday (day 3)
    const grid = daysInGrid(new Date(2026, 3, 1))
    expect(grid[0].getMonth()).toBe(2) // Previous month = March
  })

  it("fills trailing days into next month to complete the last week", () => {
    const grid = daysInGrid(new Date(2026, 2, 1)) // March ends on Tuesday
    const lastCell = grid[grid.length - 1]
    // Last cell must be a Saturday
    expect(lastCell.getDay()).toBe(6)
  })
})

// ---------------------------------------------------------------------------
// isSameMonth
// ---------------------------------------------------------------------------
describe("isSameMonth", () => {
  it("returns true for two dates in the same month/year", () => {
    expect(isSameMonth(new Date(2026, 2, 1), new Date(2026, 2, 31))).toBe(true)
  })

  it("returns false for different months, same year", () => {
    expect(isSameMonth(new Date(2026, 2, 1), new Date(2026, 3, 1))).toBe(false)
  })

  it("returns false for same month, different year", () => {
    expect(isSameMonth(new Date(2025, 2, 1), new Date(2026, 2, 1))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isSameDay
// ---------------------------------------------------------------------------
describe("isSameDay", () => {
  it("returns true for exact same date", () => {
    expect(isSameDay(new Date(2026, 2, 6), new Date(2026, 2, 6))).toBe(true)
  })

  it("returns true for same date with different times", () => {
    expect(isSameDay(new Date(2026, 2, 6, 0, 0), new Date(2026, 2, 6, 23, 59))).toBe(true)
  })

  it("returns false for adjacent days", () => {
    expect(isSameDay(new Date(2026, 2, 6), new Date(2026, 2, 7))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// parseDate
// ---------------------------------------------------------------------------
describe("parseDate", () => {
  it("parses YYYY-MM-DD without timezone drift", () => {
    const d = parseDate("2026-03-06")
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2) // 0-indexed
    expect(d.getDate()).toBe(6)
  })

  it("parses the last day of a month", () => {
    const d = parseDate("2026-02-28")
    expect(d.getDate()).toBe(28)
  })

  it("parses January 1 correctly", () => {
    const d = parseDate("2026-01-01")
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// formatDateForDisplay
// ---------------------------------------------------------------------------
describe("formatDateForDisplay", () => {
  it("returns a non-empty string for a valid date", () => {
    const result = formatDateForDisplay("2026-03-06")
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })

  it("accepts Intl format options", () => {
    const result = formatDateForDisplay("2026-03-06", { month: "long", day: "numeric", year: "numeric" })
    // Should contain the year
    expect(result).toContain("2026")
  })
})

// ---------------------------------------------------------------------------
// formatTime12Hour
// ---------------------------------------------------------------------------
describe("formatTime12Hour", () => {
  it("formats midnight as 12:00 AM", () => {
    expect(formatTime12Hour("00:00")).toBe("12:00 AM")
  })

  it("formats noon as 12:00 PM", () => {
    expect(formatTime12Hour("12:00")).toBe("12:00 PM")
  })

  it("formats 9:00 as 9:00 AM", () => {
    expect(formatTime12Hour("09:00")).toBe("9:00 AM")
  })

  it("formats 13:00 as 1:00 PM", () => {
    expect(formatTime12Hour("13:00")).toBe("1:00 PM")
  })

  it("formats 17:30 as 5:30 PM", () => {
    expect(formatTime12Hour("17:30")).toBe("5:30 PM")
  })

  it("returns empty string for empty input", () => {
    expect(formatTime12Hour("")).toBe("")
  })

  it("pads minutes correctly", () => {
    expect(formatTime12Hour("09:05")).toBe("9:05 AM")
  })
})
