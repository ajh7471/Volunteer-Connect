"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2, XCircle, Clock, Play, RotateCcw,
  ChevronDown, ChevronRight, FlaskConical,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Pure lib imports (no server / no Supabase) ───────────────────────────────
import {
  startOfMonth, endOfMonth, ymd, addMonths, daysInGrid,
  isSameMonth, isSameDay, parseDate, formatDateForDisplay, formatTime12Hour,
} from "@/lib/date"
import { getCapacityStatus } from "@/lib/shifts"
import { generateICS } from "@/lib/calendar-export"

// ─── Mini test framework ──────────────────────────────────────────────────────

type TestStatus = "passed" | "failed" | "pending"

interface TestCase {
  name: string
  status: TestStatus
  error?: string
  duration: number
}

interface TestSuite {
  name: string
  group: string
  tests: TestCase[]
  duration: number
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected)
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`)
    },
    toEqual(expected: unknown) {
      const a = JSON.stringify(actual)
      const b = JSON.stringify(expected)
      if (a !== b) throw new Error(`Expected ${b}\nbut got ${a}`)
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy but got ${JSON.stringify(actual)}`)
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy but got ${JSON.stringify(actual)}`)
    },
    toContain(sub: string) {
      if (typeof actual !== "string" || !actual.includes(sub))
        throw new Error(`Expected "${actual}" to contain "${sub}"`)
    },
    toHaveLength(len: number) {
      const arr = actual as any[]
      if (!Array.isArray(arr) || arr.length !== len)
        throw new Error(`Expected length ${len} but got ${Array.isArray(arr) ? arr.length : "non-array"}`)
    },
    toBeGreaterThan(n: number) {
      if ((actual as number) <= n)
        throw new Error(`Expected ${actual} > ${n}`)
    },
    toBeGreaterThanOrEqual(n: number) {
      if ((actual as number) < n)
        throw new Error(`Expected ${actual} >= ${n}`)
    },
    toBeLessThanOrEqual(n: number) {
      if ((actual as number) > n)
        throw new Error(`Expected ${actual} <= ${n}`)
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null but got ${JSON.stringify(actual)}`)
    },
    not: {
      toBe(expected: unknown) {
        if (actual === expected)
          throw new Error(`Expected value NOT to be ${JSON.stringify(expected)}`)
      },
      toContain(sub: string) {
        if (typeof actual === "string" && actual.includes(sub))
          throw new Error(`Expected "${actual}" NOT to contain "${sub}"`)
      },
      toBeNull() {
        if (actual === null) throw new Error("Expected value NOT to be null")
      },
    },
  }
}

type TestFn = () => void | Promise<void>

async function runSuite(
  suiteName: string,
  group: string,
  defs: [string, TestFn][],
): Promise<TestSuite> {
  const suiteStart = performance.now()
  const tests: TestCase[] = []

  for (const [name, fn] of defs) {
    const start = performance.now()
    let status: TestStatus = "passed"
    let error: string | undefined

    try {
      await fn()
    } catch (e: any) {
      status = "failed"
      error = e?.message ?? String(e)
    }

    tests.push({ name, status, error, duration: performance.now() - start })
  }

  return {
    name: suiteName,
    group,
    tests,
    duration: performance.now() - suiteStart,
  }
}

// ─── Test definitions ─────────────────────────────────────────────────────────

async function buildAllSuites(): Promise<TestSuite[]> {
  const suites: TestSuite[] = []

  // ── lib/date — startOfMonth ──────────────────────────────────────────────
  suites.push(await runSuite("lib/date › startOfMonth", "Utility (lib)", [
    ["returns day 1 for any date in March 2026", () => {
      const r = startOfMonth(new Date(2026, 2, 15))
      expect(r.getDate()).toBe(1)
      expect(r.getMonth()).toBe(2)
      expect(r.getFullYear()).toBe(2026)
    }],
    ["defaults to today and returns day 1", () => {
      expect(startOfMonth().getDate()).toBe(1)
    }],
    ["January: no month underflow", () => {
      const r = startOfMonth(new Date(2026, 0, 20))
      expect(r.getMonth()).toBe(0)
      expect(r.getDate()).toBe(1)
    }],
    ["December: month 11", () => {
      const r = startOfMonth(new Date(2026, 11, 25))
      expect(r.getMonth()).toBe(11)
      expect(r.getDate()).toBe(1)
    }],
  ]))

  // ── lib/date — endOfMonth ────────────────────────────────────────────────
  suites.push(await runSuite("lib/date › endOfMonth", "Utility (lib)", [
    ["March has 31 days", () => {
      expect(endOfMonth(new Date(2026, 2, 1)).getDate()).toBe(31)
    }],
    ["February 2025 (non-leap) has 28 days", () => {
      expect(endOfMonth(new Date(2025, 1, 1)).getDate()).toBe(28)
    }],
    ["February 2024 (leap year) has 29 days", () => {
      expect(endOfMonth(new Date(2024, 1, 1)).getDate()).toBe(29)
    }],
    ["April has 30 days", () => {
      expect(endOfMonth(new Date(2026, 3, 1)).getDate()).toBe(30)
    }],
    ["January has 31 days", () => {
      expect(endOfMonth(new Date(2026, 0, 1)).getDate()).toBe(31)
    }],
  ]))

  // ── lib/date — ymd ───────────────────────────────────────────────────────
  suites.push(await runSuite("lib/date › ymd", "Utility (lib)", [
    ["formats YYYY-MM-DD with zero padding", () => {
      expect(ymd(new Date(2026, 2, 6))).toBe("2026-03-06")
    }],
    ["pads single-digit month and day", () => {
      expect(ymd(new Date(2026, 0, 1))).toBe("2026-01-01")
    }],
    ["December 31", () => {
      expect(ymd(new Date(2026, 11, 31))).toBe("2026-12-31")
    }],
  ]))

  // ── lib/date — addMonths ─────────────────────────────────────────────────
  suites.push(await runSuite("lib/date › addMonths", "Utility (lib)", [
    ["adds 1 month", () => {
      const r = addMonths(new Date(2026, 0, 15), 1)
      expect(r.getMonth()).toBe(1)
      expect(r.getDate()).toBe(1)
    }],
    ["wraps year at December +1", () => {
      const r = addMonths(new Date(2026, 11, 1), 1)
      expect(r.getFullYear()).toBe(2027)
      expect(r.getMonth()).toBe(0)
    }],
    ["subtracts months with negative n", () => {
      const r = addMonths(new Date(2026, 2, 1), -1)
      expect(r.getMonth()).toBe(1)
    }],
    ["adds 12 months increments year", () => {
      const r = addMonths(new Date(2026, 0, 1), 12)
      expect(r.getFullYear()).toBe(2027)
      expect(r.getMonth()).toBe(0)
    }],
  ]))

  // ── lib/date — daysInGrid ────────────────────────────────────────────────
  suites.push(await runSuite("lib/date › daysInGrid", "Utility (lib)", [
    ["total cells is a multiple of 7", () => {
      const cells = daysInGrid(new Date(2026, 2, 1))
      expect(cells.length % 7).toBe(0)
    }],
    ["contains all days of the month", () => {
      const cells = daysInGrid(new Date(2026, 2, 1))
      const marchDays = cells.filter(d => d.getMonth() === 2 && d.getFullYear() === 2026)
      expect(marchDays.length).toBe(31)
    }],
    ["first cell is Sunday (weekday 0) of the grid week", () => {
      const cells = daysInGrid(new Date(2026, 2, 1))
      expect(cells[0].getDay()).toBe(0)
    }],
    ["February 2024 leap year grid contains 29 days", () => {
      const cells = daysInGrid(new Date(2024, 1, 1))
      const febDays = cells.filter(d => d.getMonth() === 1 && d.getFullYear() === 2024)
      expect(febDays.length).toBe(29)
    }],
    ["minimum grid size is 28 cells", () => {
      const cells = daysInGrid(new Date(2026, 1, 1))
      expect(cells.length).toBeGreaterThanOrEqual(28)
    }],
  ]))

  // ── lib/date — isSameMonth / isSameDay ───────────────────────────────────
  suites.push(await runSuite("lib/date › isSameMonth & isSameDay", "Utility (lib)", [
    ["same month returns true", () => {
      expect(isSameMonth(new Date(2026, 2, 1), new Date(2026, 2, 31))).toBeTruthy()
    }],
    ["different month returns false", () => {
      expect(isSameMonth(new Date(2026, 2, 1), new Date(2026, 3, 1))).toBeFalsy()
    }],
    ["isSameDay: same date returns true", () => {
      expect(isSameDay(new Date(2026, 2, 7), new Date(2026, 2, 7))).toBeTruthy()
    }],
    ["isSameDay: different date returns false", () => {
      expect(isSameDay(new Date(2026, 2, 7), new Date(2026, 2, 8))).toBeFalsy()
    }],
    ["isSameDay: different year returns false", () => {
      expect(isSameDay(new Date(2025, 2, 7), new Date(2026, 2, 7))).toBeFalsy()
    }],
  ]))

  // ── lib/date — parseDate / formatDateForDisplay / formatTime12Hour ────────
  suites.push(await runSuite("lib/date › parseDate & formatters", "Utility (lib)", [
    ["parseDate returns correct local date", () => {
      const d = parseDate("2026-03-07")
      expect(d.getFullYear()).toBe(2026)
      expect(d.getMonth()).toBe(2)
      expect(d.getDate()).toBe(7)
    }],
    ["parseDate: no timezone offset shift", () => {
      const d = parseDate("2026-01-01")
      expect(d.getDate()).toBe(1)
      expect(d.getMonth()).toBe(0)
    }],
    ["formatDateForDisplay returns non-empty string", () => {
      const s = formatDateForDisplay("2026-03-07")
      expect(typeof s).toBe("string")
      expect(s.length).toBeGreaterThan(0)
    }],
    ["formatTime12Hour: morning time", () => {
      expect(formatTime12Hour("09:00")).toBe("9:00 AM")
    }],
    ["formatTime12Hour: noon", () => {
      expect(formatTime12Hour("12:00")).toBe("12:00 PM")
    }],
    ["formatTime12Hour: afternoon", () => {
      expect(formatTime12Hour("15:00")).toBe("3:00 PM")
    }],
    ["formatTime12Hour: midnight", () => {
      expect(formatTime12Hour("00:00")).toBe("12:00 AM")
    }],
    ["formatTime12Hour: empty string returns empty", () => {
      expect(formatTime12Hour("")).toBe("")
    }],
  ]))

  // ── lib/shifts — getCapacityStatus ───────────────────────────────────────
  suites.push(await runSuite("lib/shifts › getCapacityStatus", "Utility (lib)", [
    ["0 capacity returns 'none'", () => {
      expect(getCapacityStatus(0, 0)).toBe("none")
    }],
    ["empty shift returns 'available'", () => {
      expect(getCapacityStatus(5, 0)).toBe("available")
    }],
    ["49% full returns 'available'", () => {
      expect(getCapacityStatus(100, 49)).toBe("available")
    }],
    ["50% full returns 'nearly-full'", () => {
      expect(getCapacityStatus(100, 50)).toBe("nearly-full")
    }],
    ["75% full returns 'nearly-full'", () => {
      expect(getCapacityStatus(4, 3)).toBe("nearly-full")
    }],
    ["100% full returns 'full'", () => {
      expect(getCapacityStatus(2, 2)).toBe("full")
    }],
    ["over capacity returns 'full'", () => {
      expect(getCapacityStatus(2, 3)).toBe("full")
    }],
    ["1 of 2 spots filled is nearly-full", () => {
      // 1/2 = 50% → nearly-full
      expect(getCapacityStatus(2, 1)).toBe("nearly-full")
    }],
  ]))

  // ── lib/calendar-export — generateICS ────────────────────────────────────
  suites.push(await runSuite("lib/calendar-export › generateICS", "Utility (lib)", [
    ["output begins with VCALENDAR header", () => {
      const ics = generateICS([])
      expect(ics).toContain("BEGIN:VCALENDAR")
      expect(ics).toContain("END:VCALENDAR")
    }],
    ["empty events list produces valid skeleton", () => {
      const ics = generateICS([])
      expect(ics).toContain("PRODID:-//Vanderpump Dogs")
      expect(ics).toContain("VERSION:2.0")
    }],
    ["single event produces VEVENT block", () => {
      const ics = generateICS([{
        id: "shift-1",
        summary: "Morning Shift",
        description: "9am to noon",
        location: "Vanderpump Dogs",
        startDate: new Date(Date.UTC(2026, 2, 7, 9, 0, 0)),
        endDate:   new Date(Date.UTC(2026, 2, 7, 12, 0, 0)),
      }])
      expect(ics).toContain("BEGIN:VEVENT")
      expect(ics).toContain("END:VEVENT")
      expect(ics).toContain("SUMMARY:Morning Shift")
      expect(ics).toContain("LOCATION:Vanderpump Dogs")
    }],
    ["UID contains shift id", () => {
      const ics = generateICS([{
        id: "abc-123",
        summary: "Shift",
        description: "",
        location: "",
        startDate: new Date(Date.UTC(2026, 2, 7, 9, 0, 0)),
        endDate:   new Date(Date.UTC(2026, 2, 7, 12, 0, 0)),
      }])
      expect(ics).toContain("abc-123@vanderpumpdogs.org")
    }],
    ["special chars in summary are escaped", () => {
      const ics = generateICS([{
        id: "x",
        summary: "Shift, Monday; Special",
        description: "line1\nline2",
        location: "",
        startDate: new Date(Date.UTC(2026, 2, 7, 9, 0, 0)),
        endDate:   new Date(Date.UTC(2026, 2, 7, 12, 0, 0)),
      }])
      expect(ics).toContain("SUMMARY:Shift\\, Monday\\; Special")
      expect(ics).toContain("DESCRIPTION:line1\\nline2")
    }],
    ["multiple events produce multiple VEVENT blocks", () => {
      const events = [1, 2, 3].map(i => ({
        id: `shift-${i}`,
        summary: `Shift ${i}`,
        description: "",
        location: "",
        startDate: new Date(Date.UTC(2026, 2, i, 9, 0, 0)),
        endDate:   new Date(Date.UTC(2026, 2, i, 12, 0, 0)),
      }))
      const ics = generateICS(events)
      const count = (ics.match(/BEGIN:VEVENT/g) ?? []).length
      expect(count).toBe(3)
    }],
    ["DTSTART uses UTC format", () => {
      const ics = generateICS([{
        id: "t",
        summary: "T",
        description: "",
        location: "",
        startDate: new Date(Date.UTC(2026, 2, 7, 9, 0, 0)),
        endDate:   new Date(Date.UTC(2026, 2, 7, 12, 0, 0)),
      }])
      expect(ics).toContain("DTSTART:20260307T090000Z")
      expect(ics).toContain("DTEND:20260307T120000Z")
    }],
  ]))

  // ── Admin business rules (pure logic, no DB) ─────────────────────────────
  suites.push(await runSuite("admin › capacity rules", "Admin — Logic", [
    ["shift is available when count < capacity", () => {
      expect(getCapacityStatus(5, 2)).toBe("available")
    }],
    ["shift becomes full when count equals capacity", () => {
      expect(getCapacityStatus(3, 3)).toBe("full")
    }],
    ["reducing capacity below current count still shows full", () => {
      // 3 assigned, capacity reduced to 2 → over capacity → full
      expect(getCapacityStatus(2, 3)).toBe("full")
    }],
    ["zero-capacity shift always returns none", () => {
      expect(getCapacityStatus(0, 5)).toBe("none")
    }],
  ]))

  suites.push(await runSuite("admin › date utilities for scheduling", "Admin — Logic", [
    ["addMonths correctly advances scheduling window", () => {
      const base = new Date(2026, 0, 1)   // Jan 2026
      expect(addMonths(base, 3).getMonth()).toBe(3)  // April
    }],
    ["ymd produces valid DB date strings", () => {
      const d = ymd(new Date(2026, 11, 31))
      // Must match YYYY-MM-DD exactly
      expect(/^\d{4}-\d{2}-\d{2}$/.test(d)).toBeTruthy()
    }],
    ["parseDate round-trips through ymd without drift", () => {
      const original = new Date(2026, 5, 15)
      const str = ymd(original)
      const parsed = parseDate(str)
      expect(parsed.getFullYear()).toBe(original.getFullYear())
      expect(parsed.getMonth()).toBe(original.getMonth())
      expect(parsed.getDate()).toBe(original.getDate())
    }],
    ["calendar grid covers full ISO weeks — no partial rows", () => {
      // Every month grid must be a complete multiple of 7
      for (let m = 0; m < 12; m++) {
        const cells = daysInGrid(new Date(2026, m, 1))
        expect(cells.length % 7).toBe(0)
      }
    }],
    ["calendar grid always starts on Sunday", () => {
      for (let m = 0; m < 12; m++) {
        const cells = daysInGrid(new Date(2026, m, 1))
        expect(cells[0].getDay()).toBe(0)
      }
    }],
  ]))

  suites.push(await runSuite("admin › shift time formatting", "Admin — Logic", [
    ["AM shift start displays correctly", () => {
      expect(formatTime12Hour("09:00")).toBe("9:00 AM")
    }],
    ["MID shift start displays correctly", () => {
      expect(formatTime12Hour("12:00")).toBe("12:00 PM")
    }],
    ["PM shift start displays correctly", () => {
      expect(formatTime12Hour("15:00")).toBe("3:00 PM")
    }],
    ["PM shift end displays correctly", () => {
      expect(formatTime12Hour("17:00")).toBe("5:00 PM")
    }],
    ["zero-pad minutes preserved", () => {
      expect(formatTime12Hour("09:05")).toBe("9:05 AM")
    }],
  ]))

  suites.push(await runSuite("admin › ICS export for volunteers", "Admin — Logic", [
    ["exported ICS has correct product ID", () => {
      const ics = generateICS([])
      expect(ics).toContain("PRODID:-//Vanderpump Dogs")
    }],
    ["shift exported with correct time window", () => {
      const ics = generateICS([{
        id: "s1",
        summary: "Morning Shift",
        description: "Morning shift 9–12",
        location: "Vanderpump Dogs",
        startDate: new Date(Date.UTC(2026, 2, 7, 9, 0, 0)),
        endDate:   new Date(Date.UTC(2026, 2, 7, 12, 0, 0)),
      }])
      expect(ics).toContain("DTSTART:20260307T090000Z")
      expect(ics).toContain("DTEND:20260307T120000Z")
    }],
    ["commas and semicolons in shift names are escaped", () => {
      const ics = generateICS([{
        id: "s2",
        summary: "Shift; Dogs, Cats",
        description: "",
        location: "",
        startDate: new Date(Date.UTC(2026, 2, 7, 9, 0, 0)),
        endDate:   new Date(Date.UTC(2026, 2, 7, 12, 0, 0)),
      }])
      expect(ics).toContain("SUMMARY:Shift\\; Dogs\\, Cats")
    }],
  ]))

  return suites
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function ms(n: number) {
  return n < 1000 ? `${Math.round(n)}ms` : `${(n / 1000).toFixed(2)}s`
}

function StatusIcon({ status, size = 14 }: { status: TestStatus; size?: number }) {
  if (status === "passed")
    return <CheckCircle2 className="text-green-600 dark:text-green-400 shrink-0" style={{ width: size, height: size }} />
  if (status === "failed")
    return <XCircle className="text-destructive shrink-0" style={{ width: size, height: size }} />
  return <Clock className="text-muted-foreground shrink-0" style={{ width: size, height: size }} />
}

function TestRow({ test }: { test: TestCase }) {
  const [open, setOpen] = useState(false)
  const hasError = !!test.error

  return (
    <div className="border-b last:border-0">
      <button
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/30 transition-colors",
          test.status === "failed" && "bg-destructive/5 hover:bg-destructive/8"
        )}
        onClick={() => hasError && setOpen(o => !o)}
        disabled={!hasError}
      >
        <StatusIcon status={test.status} />
        <span className="flex-1 text-xs font-mono">{test.name}</span>
        <span className="text-xs text-muted-foreground tabular-nums ml-2 shrink-0">{ms(test.duration)}</span>
        {hasError && (
          open
            ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && test.error && (
        <div className="px-3 pb-3">
          <pre className="text-xs bg-destructive/8 text-destructive rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono leading-relaxed">
            {test.error}
          </pre>
        </div>
      )}
    </div>
  )
}

function SuiteCard({ suite }: { suite: TestSuite }) {
  const failed = suite.tests.filter(t => t.status === "failed").length
  const passed = suite.tests.filter(t => t.status === "passed").length
  const [open, setOpen] = useState(failed > 0)

  return (
    <Card className={cn("overflow-hidden", failed > 0 && "border-destructive/40")}>
      <button className="w-full text-left" onClick={() => setOpen(o => !o)}>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-3">
            <StatusIcon status={failed > 0 ? "failed" : "passed"} size={16} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{suite.name}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="text-xs font-mono tabular-nums">
                {passed}/{suite.tests.length}
              </Badge>
              {failed > 0 && (
                <Badge variant="destructive" className="text-xs tabular-nums">
                  {failed} fail
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{ms(suite.duration)}</span>
              {open
                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </CardHeader>
      </button>
      {open && (
        <CardContent className="p-0 border-t">
          {suite.tests.map((t, i) => <TestRow key={i} test={t} />)}
        </CardContent>
      )}
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const GROUP_ORDER = ["Utility (lib)", "Admin — Logic", "Admin — Actions", "Other"]

export default function TestsPage() {
  const [running, setRunning]   = useState(false)
  const [suites, setSuites]     = useState<TestSuite[]>([])
  const [ranAt, setRanAt]       = useState<string | null>(null)
  const [totalMs, setTotalMs]   = useState(0)

  const runAll = useCallback(async () => {
    setRunning(true)
    setSuites([])
    const t0 = performance.now()
    const results = await buildAllSuites()
    setTotalMs(performance.now() - t0)
    setSuites(results)
    setRanAt(new Date().toLocaleTimeString())
    setRunning(false)
  }, [])

  const totalTests  = suites.reduce((s, su) => s + su.tests.length, 0)
  const totalPassed = suites.reduce((s, su) => s + su.tests.filter(t => t.status === "passed").length, 0)
  const totalFailed = suites.reduce((s, su) => s + su.tests.filter(t => t.status === "failed").length, 0)
  const allPass = totalTests > 0 && totalFailed === 0

  // Group suites
  const groups: Record<string, TestSuite[]> = {}
  for (const suite of suites) {
    if (!groups[suite.group]) groups[suite.group] = []
    groups[suite.group].push(suite)
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            Test Suite
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Unit + logic tests — runs live in the browser, no build step needed
          </p>
        </div>
        <Button onClick={runAll} disabled={running} className="shrink-0 gap-2">
          {running
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
            : suites.length
            ? <><RotateCcw className="h-4 w-4" /> Re-run</>
            : <><Play className="h-4 w-4" /> Run Tests</>}
        </Button>
      </div>

      {/* Summary bar */}
      {suites.length > 0 && (
        <>
          <div className={cn(
            "rounded-lg border p-4 flex flex-wrap gap-6 items-center",
            allPass
              ? "border-green-500/40 bg-green-50/50 dark:bg-green-950/20"
              : "border-destructive/40 bg-destructive/5"
          )}>
            <div className="flex items-center gap-2">
              {allPass
                ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                : <XCircle className="h-5 w-5 text-destructive" />}
              <span className={cn(
                "text-sm font-semibold",
                allPass ? "text-green-700 dark:text-green-300" : "text-destructive"
              )}>
                {allPass ? "All tests passed" : `${totalFailed} test${totalFailed !== 1 ? "s" : ""} failed`}
              </span>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-green-700 dark:text-green-400 font-medium tabular-nums">{totalPassed} passed</span>
              {totalFailed > 0 && (
                <span className="text-destructive font-medium tabular-nums">{totalFailed} failed</span>
              )}
              <span className="text-muted-foreground tabular-nums">{totalTests} total</span>
            </div>
            <span className="text-xs text-muted-foreground ml-auto tabular-nums">
              {ms(totalMs)} · {ranAt}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-muted overflow-hidden -mt-4">
            <div
              className={cn("h-full rounded-full transition-all", allPass ? "bg-green-500" : "bg-destructive")}
              style={{ width: totalTests > 0 ? `${Math.round((totalPassed / totalTests) * 100)}%` : "0%" }}
            />
          </div>
        </>
      )}

      {/* Idle state */}
      {!running && suites.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Click <strong>Run Tests</strong> to execute the full suite</p>
          <p className="text-xs mt-1 opacity-70">lib/date · lib/shifts · lib/calendar-export · admin logic</p>
        </div>
      )}

      {/* Running */}
      {running && (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <Loader2 className="h-10 w-10 mx-auto mb-3 opacity-40 animate-spin" />
          <p className="text-sm">Running tests…</p>
        </div>
      )}

      {/* Results grouped */}
      {GROUP_ORDER.map(groupName => {
        const groupSuites = groups[groupName]
        if (!groupSuites?.length) return null
        const gPassed = groupSuites.reduce((s, su) => s + su.tests.filter(t => t.status === "passed").length, 0)
        const gTotal  = groupSuites.reduce((s, su) => s + su.tests.length, 0)
        const gFailed = groupSuites.reduce((s, su) => s + su.tests.filter(t => t.status === "failed").length, 0)

        return (
          <div key={groupName} className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{groupName}</h2>
              <span className="text-xs text-muted-foreground">
                {gPassed}/{gTotal}
                {gFailed > 0 && <span className="text-destructive ml-1">· {gFailed} failed</span>}
              </span>
            </div>
            {groupSuites.map((suite, i) => (
              <SuiteCard key={i} suite={suite} />
            ))}
          </div>
        )
      })}

      {/* Footer note */}
      {suites.length > 0 && (
        <p className="text-xs text-muted-foreground text-center pb-4">
          Tests run entirely in-browser against live imported modules. Server action tests require a separate CI environment.
        </p>
      )}
    </div>
  )
}
