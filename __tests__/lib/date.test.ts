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

  it("handles December correctly", () => {
    const result = startOfMonth(new Date(2026, 11, 25))
    expect(result.getMonth()).toBe(11)
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

  it("returns 31 for January", () => {
    expect(endOfMonth(new Date(2026, 0, 1)).getDate()).toBe(31)
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

  it("handles the last day of a leap year", () => {
    expect(ymd(new Date(2024, 11, 31))).toBe("2024-12-31")
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

  it("rolls over year boundary going forward", () => {
    const result = addMonths(new Date(2026, 11, 1), 1)
    expect(result.getMonth()).toBe(0)
    expect(result.getFullYear()).toBe(2027)
  })

  it("handles negative months (going back past year boundary)", () => {
    const result = addMonths(new Date(2026, 2, 1), -3)
    expect(result.getMonth()).toBe(11)
    expect(result.getFullYear()).toBe(2025)
  })

  it("returns the 1st of the resulting month", () => {
    const result = addMonths(new Date(2026, 5, 20), 1)
    expect(result.getDate()).toBe(1)
  })

  it("adding 0 months returns the same month", () => {
    const result = addMonths(new Date(2026, 3, 1), 0)
    expect(result.getMonth()).toBe(3)
    expect(result.getFullYear()).toBe(2026)
  })
})

// ---------------------------------------------------------------------------
// daysInGrid
// ---------------------------------------------------------------------------
describe("daysInGrid", () => {
  it("always returns a length divisible by 7 for all months of 2026", () => {
    for (let month = 0; month < 12; month++) {
      const grid = daysInGrid(new Date(2026, month, 1))
      expect(grid.length % 7).toBe(0)
    }
  })

  it("includes all 31 days of March 2026", () => {
    const grid = daysInGrid(new Date(2026, 2, 1))
    const marchDays = grid.filter((d) => d.getMonth() === 2 && d.getFullYear() === 2026)
    expect(marchDays).toHaveLength(31)
  })

  it("starts on the correct weekday — March 2026 starts on Sunday (index 0)", () => {
    const grid = daysInGrid(new Date(2026, 2, 1))
    // March 1 2026 is a Sunday, so grid[0] should be March 1
    expect(grid[0].getDate()).toBe(1)
    expect(grid[0].getMonth()).toBe(2)
  })

  it("fills leading cells from previous month for months not starting on Sunday", () => {
    // April 1 2026 is a Wednesday, so grid[0..2] should be from March
    const grid = daysInGrid(new Date(2026, 3, 1))
    expect(grid[0].getMonth()).toBe(2)
  })

  it("fills trailing cells into next month to complete the last week", () => {
    const grid = daysInGrid(new Date(2026, 2, 1))
    const lastCell = grid[grid.length - 1]
    expect(lastCell.getDay()).toBe(6) // must end on Saturday
  })

  it("minimum 28 cells for February", () => {
    const grid = daysInGrid(new Date(2025, 1, 1))
    expect(grid.length).toBeGreaterThanOrEqual(28)
  })
})

// ---------------------------------------------------------------------------
// isSameMonth
// ---------------------------------------------------------------------------
describe("isSameMonth", () => {
  it("returns true for two dates in the same month and year", () => {
    expect(isSameMonth(new Date(2026, 2, 1), new Date(2026, 2, 31))).toBe(true)
  })

  it("returns false for different months in the same year", () => {
    expect(isSameMonth(new Date(2026, 2, 1), new Date(2026, 3, 1))).toBe(false)
  })

  it("returns false for same month number in different years", () => {
    expect(isSameMonth(new Date(2025, 2, 1), new Date(2026, 2, 1))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isSameDay
// ---------------------------------------------------------------------------
describe("isSameDay", () => {
  it("returns true for the same date", () => {
    expect(isSameDay(new Date(2026, 2, 6), new Date(2026, 2, 6))).toBe(true)
  })

  it("returns true for same date with different times", () => {
    expect(isSameDay(new Date(2026, 2, 6, 0, 0), new Date(2026, 2, 6, 23, 59))).toBe(true)
  })

  it("returns false for adjacent days", () => {
    expect(isSameDay(new Date(2026, 2, 6), new Date(2026, 2, 7))).toBe(false)
  })

  it("returns false for same day in different months", () => {
    expect(isSameDay(new Date(2026, 2, 6), new Date(2026, 3, 6))).toBe(false)
  })

  it("returns false for same day in different years", () => {
    expect(isSameDay(new Date(2025, 2, 6), new Date(2026, 2, 6))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// parseDate
// ---------------------------------------------------------------------------
describe("parseDate", () => {
  it("parses YYYY-MM-DD without timezone drift", () => {
    const d = parseDate("2026-03-06")
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2)
    expect(d.getDate()).toBe(6)
  })

  it("parses the last day of February", () => {
    const d = parseDate("2026-02-28")
    expect(d.getDate()).toBe(28)
    expect(d.getMonth()).toBe(1)
  })

  it("parses January 1 correctly", () => {
    const d = parseDate("2026-01-01")
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(1)
  })

  it("parses December 31 correctly", () => {
    const d = parseDate("2026-12-31")
    expect(d.getMonth()).toBe(11)
    expect(d.getDate()).toBe(31)
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

  it("includes the year when passed year option", () => {
    const result = formatDateForDisplay("2026-03-06", { year: "numeric" })
    expect(result).toContain("2026")
  })

  it("accepts Intl format options and includes full month name", () => {
    const result = formatDateForDisplay("2026-03-06", { month: "long" })
    expect(result).toContain("March")
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

  it("pads minutes correctly for :05", () => {
    expect(formatTime12Hour("09:05")).toBe("9:05 AM")
  })

  it("handles 11:59 PM", () => {
    expect(formatTime12Hour("23:59")).toBe("11:59 PM")
  })

  it("handles 12:01 PM correctly", () => {
    expect(formatTime12Hour("12:01")).toBe("12:01 PM")
  })
})
