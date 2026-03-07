import { describe, it, expect } from "vitest"
import { generateICS } from "@/lib/calendar-export"
import type { CalendarEvent } from "@/lib/calendar-export"

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "test-shift-1",
    summary: "Morning Volunteer Shift",
    description: "Volunteer shift at Vanderpump Dogs",
    location: "Vanderpump Dogs Rescue",
    startDate: new Date("2026-03-06T09:00:00Z"),
    endDate: new Date("2026-03-06T12:00:00Z"),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// generateICS — structure
// ---------------------------------------------------------------------------
describe("generateICS", () => {
  it("wraps output in VCALENDAR BEGIN/END tags", () => {
    const ics = generateICS([makeEvent()])
    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("END:VCALENDAR")
  })

  it("includes correct PRODID", () => {
    const ics = generateICS([makeEvent()])
    expect(ics).toContain("PRODID:-//Vanderpump Dogs//Volunteer Calendar//EN")
  })

  it("wraps each event in VEVENT BEGIN/END", () => {
    const ics = generateICS([makeEvent()])
    expect(ics).toContain("BEGIN:VEVENT")
    expect(ics).toContain("END:VEVENT")
  })

  it("embeds UID using event id and domain", () => {
    const ics = generateICS([makeEvent({ id: "shift-abc" })])
    expect(ics).toContain("UID:shift-abc@vanderpumpdogs.org")
  })

  it("includes SUMMARY with event title", () => {
    const ics = generateICS([makeEvent()])
    expect(ics).toContain("SUMMARY:Morning Volunteer Shift")
  })

  it("includes DESCRIPTION", () => {
    const ics = generateICS([makeEvent()])
    expect(ics).toContain("DESCRIPTION:Volunteer shift at Vanderpump Dogs")
  })

  it("includes LOCATION", () => {
    const ics = generateICS([makeEvent()])
    expect(ics).toContain("LOCATION:Vanderpump Dogs Rescue")
  })

  it("includes DTSTART in UTC format", () => {
    const ics = generateICS([makeEvent()])
    expect(ics).toContain("DTSTART:20260306T090000Z")
  })

  it("includes DTEND in UTC format", () => {
    const ics = generateICS([makeEvent()])
    expect(ics).toContain("DTEND:20260306T120000Z")
  })

  it("generates multiple VEVENT blocks for multiple events", () => {
    const events = [makeEvent({ id: "e1" }), makeEvent({ id: "e2" }), makeEvent({ id: "e3" })]
    const ics = generateICS(events)
    const matches = ics.match(/BEGIN:VEVENT/g) || []
    expect(matches).toHaveLength(3)
  })

  it("returns a valid ICS string for empty event list", () => {
    const ics = generateICS([])
    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("END:VCALENDAR")
    expect(ics).not.toContain("BEGIN:VEVENT")
  })

  it("escapes commas in text fields", () => {
    const ics = generateICS([makeEvent({ summary: "Morning, Afternoon Shift" })])
    expect(ics).toContain("SUMMARY:Morning\\, Afternoon Shift")
  })

  it("escapes semicolons in text fields", () => {
    const ics = generateICS([makeEvent({ description: "Shift; bring your own supplies" })])
    expect(ics).toContain("DESCRIPTION:Shift\\; bring your own supplies")
  })

  it("escapes newlines in text fields", () => {
    const ics = generateICS([makeEvent({ description: "Line 1\nLine 2" })])
    expect(ics).toContain("DESCRIPTION:Line 1\\nLine 2")
  })

  it("marks STATUS as CONFIRMED", () => {
    const ics = generateICS([makeEvent()])
    expect(ics).toContain("STATUS:CONFIRMED")
  })

  it("sets CALSCALE:GREGORIAN", () => {
    const ics = generateICS([makeEvent()])
    expect(ics).toContain("CALSCALE:GREGORIAN")
  })
})
