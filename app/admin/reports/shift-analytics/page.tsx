"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import RequireAuth from "@/app/components/RequireAuth"
import { useSessionRole } from "@/lib/useSession"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Download,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Clock,
  Calendar,
  X,
} from "lucide-react"
import {
  getShiftFillRates,
  getShiftStatistics,
  exportShiftReportCSV,
  type ShiftFillRate,
  type ShiftStatistics,
} from "../../reporting-actions"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { formatTime12Hour, parseDate } from "@/lib/date"
import { cn } from "@/lib/utils"

// ─── Period presets ───────────────────────────────────────────────────────────

type Period = "this_week" | "next_week" | "2_weeks" | "this_month" | "next_month" | "last_30" | "custom"

function getPeriodDates(period: Period): { start: string; end: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const fmt = (d: Date) => d.toISOString().split("T")[0]

  const startOfWeek = (d: Date) => {
    const copy = new Date(d)
    const day = copy.getDay()
    copy.setDate(copy.getDate() - day)
    return copy
  }

  switch (period) {
    case "this_week": {
      const s = startOfWeek(today)
      const e = new Date(s); e.setDate(s.getDate() + 6)
      return { start: fmt(s), end: fmt(e) }
    }
    case "next_week": {
      const s = startOfWeek(today); s.setDate(s.getDate() + 7)
      const e = new Date(s); e.setDate(s.getDate() + 6)
      return { start: fmt(s), end: fmt(e) }
    }
    case "2_weeks": {
      const s = new Date(today)
      const e = new Date(today); e.setDate(today.getDate() + 13)
      return { start: fmt(s), end: fmt(e) }
    }
    case "this_month": {
      const s = new Date(today.getFullYear(), today.getMonth(), 1)
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: fmt(s), end: fmt(e) }
    }
    case "next_month": {
      const s = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      const e = new Date(today.getFullYear(), today.getMonth() + 2, 0)
      return { start: fmt(s), end: fmt(e) }
    }
    case "last_30":
    default: {
      const s = new Date(today); s.setDate(today.getDate() - 30)
      return { start: fmt(s), end: fmt(today) }
    }
  }
}

const PERIOD_LABELS: { value: Period; label: string }[] = [
  { value: "this_week",   label: "This Week" },
  { value: "next_week",   label: "Next Week" },
  { value: "2_weeks",     label: "Next 2 Weeks" },
  { value: "this_month",  label: "This Month" },
  { value: "next_month",  label: "Next Month" },
  { value: "last_30",     label: "Last 30 Days" },
  { value: "custom",      label: "Custom" },
]

// ─── Sorting ──────────────────────────────────────────────────────────────────

type SortKey = "shift_date" | "slot" | "fill_rate_percent" | "fill_status" | "capacity" | "filled_count"
type SortDir = "asc" | "desc"

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50 inline" />
  return sortDir === "asc"
    ? <ArrowUp className="ml-1 h-3 w-3 text-primary inline" />
    : <ArrowDown className="ml-1 h-3 w-3 text-primary inline" />
}

// ─── Shift detail modal (read-only, matches volunteer view) ───────────────────

type ShiftDetail = {
  id: string
  shift_date: string
  start_time: string
  end_time: string
  slot: string
  capacity: number
  filled_count: number
  fill_status: string
  attendees: Array<{ name: string | null; email: string }>
}

function ShiftDetailModal({ shiftId, onClose }: { shiftId: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<ShiftDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!shiftId) { setDetail(null); return }
    setLoading(true)
    supabase
      .from("shifts")
      .select(`
        id, shift_date, start_time, end_time, slot, capacity,
        shift_assignments(
          profiles(id, name, email)
        )
      `)
      .eq("id", shiftId)
      .single()
      .then(({ data }) => {
        if (!data) { setLoading(false); return }
        const filled = (data.shift_assignments as any[]) ?? []
        const attendees = filled.map((a: any) => ({
          name: a.profiles?.name ?? null,
          email: a.profiles?.email ?? "",
        }))
        const filled_count = filled.length
        const pct = data.capacity > 0 ? Math.round((filled_count / data.capacity) * 100) : 0
        const fill_status = filled_count >= data.capacity ? "Full" : filled_count > 0 ? "Partial" : "Empty"
        setDetail({
          id: data.id,
          shift_date: data.shift_date,
          start_time: data.start_time,
          end_time: data.end_time,
          slot: data.slot,
          capacity: data.capacity,
          filled_count,
          fill_status,
          attendees,
        })
        setLoading(false)
      })
  }, [shiftId])

  const statusColor = detail?.fill_status === "Full"
    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300"
    : detail?.fill_status === "Partial"
      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300"
      : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300"

  return (
    <Dialog open={!!shiftId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            Shift Details
          </DialogTitle>
          <DialogDescription className="text-xs">Read-only view — manage via Shift Management</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading shift details…</div>
        ) : detail ? (
          <div className="space-y-4">
            {/* Date + time */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium">
                  {parseDate(detail.shift_date).toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric", year: "numeric"
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>
                  {detail.slot} &middot; {formatTime12Hour(detail.start_time)} – {formatTime12Hour(detail.end_time)}
                </span>
              </div>
            </div>

            {/* Capacity bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Capacity
                </span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", statusColor)}>
                  {detail.fill_status}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    detail.fill_status === "Full" ? "bg-green-500" :
                    detail.fill_status === "Partial" ? "bg-amber-500" : "bg-muted-foreground/30"
                  )}
                  style={{ width: `${Math.min((detail.filled_count / detail.capacity) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {detail.filled_count} / {detail.capacity} volunteers
              </p>
            </div>

            {/* Attendee list */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signed Up</p>
              {detail.attendees.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No volunteers assigned</p>
              ) : (
                <div className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
                  {detail.attendees.map((a, i) => (
                    <div key={i} className="px-3 py-2 text-sm flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                        {(a.name || a.email)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-1">
              <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                <Link href="/admin/shifts">Manage in Shift Management</Link>
              </Button>
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">Shift not found.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ShiftAnalyticsPage() {
  const router = useRouter()
  const { role, loading: roleLoading } = useSessionRole()
  const isAdmin = roleLoading ? null : role === "admin"

  const [period, setPeriod] = useState<Period>("2_weeks")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [fillRates, setFillRates] = useState<ShiftFillRate[]>([])
  const [statistics, setStatistics] = useState<ShiftStatistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterSlot, setFilterSlot] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("shift_date")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)

  // Initialise dates from period
  useEffect(() => {
    if (period !== "custom") {
      const { start, end } = getPeriodDates(period)
      setStartDate(start)
      setEndDate(end)
    }
  }, [period])

  // Auto-load when dates are set
  useEffect(() => {
    if (startDate && endDate && isAdmin === true) {
      loadData(startDate, endDate)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, isAdmin])

  const loadData = useCallback(async (s: string, e: string) => {
    setLoading(true)
    const [fillRes, statsRes] = await Promise.all([
      getShiftFillRates(s, e),
      getShiftStatistics(s, e),
    ])
    if (fillRes.success) setFillRates(fillRes.data ?? [])
    if (statsRes.success) setStatistics(statsRes.data ?? null)
    setLoading(false)
  }, [])

  async function handleExport() {
    const result = await exportShiftReportCSV(startDate, endDate)
    if (result.success && result.csv) {
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" })
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = `shift_report_${startDate}_to_${endDate}.csv`
      a.click()
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  // Unique slot values for filter dropdown
  const slotOptions = useMemo(() => {
    const set = new Set(fillRates.map((r) => r.slot))
    return Array.from(set).sort()
  }, [fillRates])

  const processed = useMemo(() => {
    let rows = [...fillRates]
    if (filterStatus !== "all") rows = rows.filter((r) => r.fill_status.toLowerCase() === filterStatus)
    if (filterSlot !== "all") rows = rows.filter((r) => r.slot === filterSlot)
    rows.sort((a, b) => {
      let av: any = a[sortKey as keyof ShiftFillRate]
      let bv: any = b[sortKey as keyof ShiftFillRate]
      if (typeof av === "string") av = av.toLowerCase()
      if (typeof bv === "string") bv = bv.toLowerCase()
      if (av < bv) return sortDir === "asc" ? -1 : 1
      if (av > bv) return sortDir === "asc" ? 1 : -1
      return 0
    })
    return rows
  }, [fillRates, filterStatus, filterSlot, sortKey, sortDir])

  const hasActiveFilters = filterStatus !== "all" || filterSlot !== "all"

  if (isAdmin === false) {
    return (
      <RequireAuth>
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access reports.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/calendar")}>Go to Calendar</Button>
          </CardContent>
        </Card>
      </RequireAuth>
    )
  }

  if (isAdmin === null) {
    return (
      <RequireAuth>
        <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shift Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Fill rates and capacity utilization</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/reports">Back to Reports</Link>
          </Button>
        </div>

        {/* Period chips + optional custom dates */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {PERIOD_LABELS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                    period === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/60"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {period === "custom" && (
              <div className="flex flex-wrap gap-3 items-end pt-1">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Start</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 text-sm w-36"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">End</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="h-8 text-sm w-36"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => loadData(startDate, endDate)}
                  disabled={!startDate || !endDate || loading}
                >
                  Apply
                </Button>
              </div>
            )}

            {startDate && endDate && period !== "custom" && (
              <p className="text-xs text-muted-foreground">
                {new Date(startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {" — "}
                {new Date(endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Summary stat strip */}
        {statistics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: TrendingUp,    label: "Avg Fill Rate",   value: `${statistics.avg_fill_rate}%`,    sub: `${statistics.total_filled}/${statistics.total_capacity} spots` },
              { icon: CheckCircle,  label: "Full Shifts",     value: statistics.full_shifts,             sub: `${statistics.total_shifts > 0 ? Math.round((statistics.full_shifts / statistics.total_shifts) * 100) : 0}% of total`, iconClass: "text-green-600" },
              { icon: AlertCircle,  label: "Partial Shifts",  value: statistics.partial_shifts,          sub: "Need volunteers", iconClass: "text-amber-600" },
              { icon: Users,        label: "Empty Shifts",    value: statistics.empty_shifts,            sub: "Require attention", iconClass: "text-red-500" },
            ].map(({ icon: Icon, label, value, sub, iconClass }) => (
              <div key={label} className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 flex items-center gap-3">
                <Icon className={cn("h-4 w-4 shrink-0", iconClass ?? "text-muted-foreground")} />
                <div>
                  <p className="text-lg font-bold leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  <p className="text-xs text-muted-foreground/70">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table with filters + sort */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-sm font-semibold">
                  {processed.length} shift{processed.length !== 1 ? "s" : ""}
                  {hasActiveFilters && " (filtered)"}
                </CardTitle>

                {/* Status filter chips */}
                <div className="flex gap-1">
                  {["all", "full", "partial", "empty"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full border text-xs font-medium transition-all capitalize",
                        filterStatus === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {s === "all" ? "All" : s}
                    </button>
                  ))}
                </div>

                {/* Slot filter */}
                {slotOptions.length > 1 && (
                  <select
                    value={filterSlot}
                    onChange={(e) => setFilterSlot(e.target.value)}
                    className="h-7 rounded-md border border-input bg-background px-2 py-0 text-xs"
                  >
                    <option value="all">All slots</option>
                    {slotOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}

                {/* Clear filters */}
                {hasActiveFilters && (
                  <button
                    onClick={() => { setFilterStatus("all"); setFilterSlot("all") }}
                    className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              {processed.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExport} className="h-7 text-xs gap-1.5">
                  <Download className="h-3 w-3" /> Export CSV
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-sm text-muted-foreground">Loading shift analytics…</div>
            ) : processed.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                {fillRates.length === 0 ? "No shifts found for this period." : "No shifts match the current filters."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">
                        <button
                          onClick={() => toggleSort("shift_date")}
                          className="flex items-center text-xs font-semibold uppercase tracking-wide hover:text-foreground"
                        >
                          Date <SortIcon col="shift_date" sortKey={sortKey} sortDir={sortDir} />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => toggleSort("slot")}
                          className="flex items-center text-xs font-semibold uppercase tracking-wide hover:text-foreground"
                        >
                          Slot <SortIcon col="slot" sortKey={sortKey} sortDir={sortDir} />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => toggleSort("capacity")}
                          className="flex items-center text-xs font-semibold uppercase tracking-wide hover:text-foreground"
                        >
                          Cap. <SortIcon col="capacity" sortKey={sortKey} sortDir={sortDir} />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => toggleSort("filled_count")}
                          className="flex items-center text-xs font-semibold uppercase tracking-wide hover:text-foreground"
                        >
                          Filled <SortIcon col="filled_count" sortKey={sortKey} sortDir={sortDir} />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => toggleSort("fill_rate_percent")}
                          className="flex items-center text-xs font-semibold uppercase tracking-wide hover:text-foreground"
                        >
                          Fill % <SortIcon col="fill_rate_percent" sortKey={sortKey} sortDir={sortDir} />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => toggleSort("fill_status")}
                          className="flex items-center text-xs font-semibold uppercase tracking-wide hover:text-foreground"
                        >
                          Status <SortIcon col="fill_status" sortKey={sortKey} sortDir={sortDir} />
                        </button>
                      </TableHead>
                      <TableHead className="pr-4 text-right text-xs font-semibold uppercase tracking-wide">
                        Detail
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {processed.map((shift) => {
                      const dateObj = new Date(shift.shift_date + "T00:00:00")
                      const isToday = shift.shift_date === new Date().toISOString().split("T")[0]
                      const isPast = dateObj < new Date(new Date().setHours(0,0,0,0))
                      return (
                        <TableRow
                          key={shift.shift_id}
                          className={cn(
                            "text-sm",
                            isPast && !isToday && "opacity-60",
                            isToday && "bg-primary/5"
                          )}
                        >
                          <TableCell className="pl-4 font-medium whitespace-nowrap">
                            {isToday && (
                              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
                            )}
                            {dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="text-xs font-medium">{shift.slot}</span>
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              {formatTime12Hour(shift.start_time)}–{formatTime12Hour(shift.end_time)}
                            </span>
                          </TableCell>
                          <TableCell className="tabular-nums">{shift.capacity}</TableCell>
                          <TableCell className="tabular-nums">{shift.filled_count}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full",
                                    shift.fill_rate_percent >= 100 ? "bg-green-500" :
                                    shift.fill_rate_percent >= 50  ? "bg-amber-500" : "bg-red-500"
                                  )}
                                  style={{ width: `${Math.min(shift.fill_rate_percent, 100)}%` }}
                                />
                              </div>
                              <span className="tabular-nums text-xs">{shift.fill_rate_percent}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                shift.fill_status === "Full" ? "default" :
                                shift.fill_status === "Partial" ? "secondary" : "destructive"
                              }
                              className="text-xs"
                            >
                              {shift.fill_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-4 text-right">
                            <button
                              onClick={() => setSelectedShiftId(shift.shift_id)}
                              className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                            >
                              View <ChevronRight className="h-3 w-3" />
                            </button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ShiftDetailModal shiftId={selectedShiftId} onClose={() => setSelectedShiftId(null)} />
    </RequireAuth>
  )
}
