"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from 'next/navigation'
import RequireAuth from "@/app/components/RequireAuth"
import { useSessionRole } from "@/lib/useSession"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Users, TrendingUp, Download, FileText, ArrowRight } from 'lucide-react'
import {
  getDashboardStats,
  getShiftStatistics,
  getPopularTimeSlots,
  getRecentActivity,
  exportVolunteersCSV,
  exportShiftReportCSV,
  exportAttendanceCSV,
  type ShiftStatistics,
} from "../reporting-actions"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Period = "this_week" | "next_week" | "2_weeks" | "this_month" | "next_month" | "last_30"

const PERIOD_LABELS: { value: Period; label: string }[] = [
  { value: "this_week",  label: "This Week" },
  { value: "next_week",  label: "Next Week" },
  { value: "2_weeks",    label: "2 Weeks" },
  { value: "this_month", label: "This Month" },
  { value: "next_month", label: "Next Month" },
  { value: "last_30",    label: "Last 30d" },
]

function getPeriodDates(period: Period): { start: string; end: string } {
  const today = new Date(); today.setHours(0,0,0,0)
  const fmt = (d: Date) => d.toISOString().split("T")[0]
  const sow = (d: Date) => { const c = new Date(d); c.setDate(c.getDate() - c.getDay()); return c }
  switch (period) {
    case "this_week":  { const s = sow(today); const e = new Date(s); e.setDate(s.getDate()+6); return { start: fmt(s), end: fmt(e) } }
    case "next_week":  { const s = sow(today); s.setDate(s.getDate()+7); const e = new Date(s); e.setDate(s.getDate()+6); return { start: fmt(s), end: fmt(e) } }
    case "2_weeks":    { const e = new Date(today); e.setDate(today.getDate()+13); return { start: fmt(today), end: fmt(e) } }
    case "this_month": { const s = new Date(today.getFullYear(),today.getMonth(),1); const e = new Date(today.getFullYear(),today.getMonth()+1,0); return { start: fmt(s), end: fmt(e) } }
    case "next_month": { const s = new Date(today.getFullYear(),today.getMonth()+1,1); const e = new Date(today.getFullYear(),today.getMonth()+2,0); return { start: fmt(s), end: fmt(e) } }
    default:           { const s = new Date(today); s.setDate(today.getDate()-30); return { start: fmt(s), end: fmt(today) } }
  }
}

type PopularSlot = {
  slot: string
  total_shifts: number
  avg_fill_rate: number
  total_volunteers: number
}

type RecentActivity = {
  id: string
  type: "signup" | "cancellation"
  volunteer_name: string
  shift_date: string
  slot: string
  created_at: string
}

export default function ReportsPage() {
  const router = useRouter()
  const { role, loading: roleLoading } = useSessionRole()
  const isAdmin = roleLoading ? null : role === "admin"
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [shiftStats, setShiftStats] = useState<ShiftStatistics | null>(null)
  const [popularSlots, setPopularSlots] = useState<PopularSlot[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [fillPeriod, setFillPeriod] = useState<Period>("2_weeks")
  const [fillLoading, setFillLoading] = useState(false)

  const loadFillStats = useCallback(async (period: Period) => {
    setFillLoading(true)
    const { start, end } = getPeriodDates(period)
    const res = await getShiftStatistics(start, end)
    if (res.success) setShiftStats(res.data || null)
    setFillLoading(false)
  }, [])

  useEffect(() => {
    loadFillStats(fillPeriod)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillPeriod])

  useEffect(() => {
    if (isAdmin === true) {
      loadData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  async function loadData() {
    try {
      setLoading(true)

      // Get date ranges
      const today = new Date()
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const startDate = thirtyDaysAgo.toISOString().split("T")[0]
      const endDate = today.toISOString().split("T")[0]

      // Load all data in parallel with error handling
      const results = await Promise.allSettled([
        getDashboardStats(),
        getPopularTimeSlots(),
        getRecentActivity(10),
      ])

      const [statsRes, slotsRes, activityRes] = results

      if (statsRes.status === "fulfilled" && statsRes.value.success) {
        setDashboardStats(statsRes.value.data)
      }

      if (slotsRes.status === "fulfilled" && slotsRes.value.success) {
        setPopularSlots(slotsRes.value.data || [])
      }

      if (activityRes.status === "fulfilled" && activityRes.value.success) {
        setRecentActivity(activityRes.value.data || [])
      }
    } catch (error: unknown) {
      console.error("[v0] Error loading report data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleExportVolunteers() {
    const result = await exportVolunteersCSV()
    if (result.success && result.csv) {
      downloadCSV(result.csv, `volunteers_${new Date().toISOString().split("T")[0]}.csv`)
    }
  }

  async function handleExportShiftReport() {
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const startDate = thirtyDaysAgo.toISOString().split("T")[0]
    const endDate = today.toISOString().split("T")[0]

    const result = await exportShiftReportCSV(startDate, endDate)
    if (result.success && result.csv) {
      downloadCSV(result.csv, `shift_report_${startDate}_to_${endDate}.csv`)
    }
  }

  async function handleExportAttendance() {
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const startDate = thirtyDaysAgo.toISOString().split("T")[0]
    const endDate = today.toISOString().split("T")[0]

    const result = await exportAttendanceCSV(undefined, startDate, endDate)
    if (result.success && result.csv) {
      downloadCSV(result.csv, `attendance_report_${new Date().toISOString().split("T")[0]}.csv`)
    }
  }

  function downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
  }

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

  if (isAdmin === null || loading) {
    return (
      <RequireAuth>
        <div className="text-center">
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Volunteer activity and shift statistics</p>
        </div>

        {/* Inline stat strip — always visible, no popup required */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: Users,      label: "Volunteers",     value: dashboardStats?.totalVolunteers ?? "—" },
            { icon: Calendar,   label: "Total Shifts",   value: dashboardStats?.totalShifts ?? "—" },
            { icon: FileText,   label: "Assignments",    value: dashboardStats?.totalAssignments ?? "—" },
            { icon: TrendingUp, label: "Active / Month", value: dashboardStats?.activeThisMonth ?? "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 flex items-center gap-3">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-lg font-bold leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Shift fill + popular slots side by side */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Shift Fill Rates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Period chips */}
              <div className="flex flex-wrap gap-1">
                {PERIOD_LABELS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFillPeriod(value)}
                    className={cn(
                      "px-2.5 py-1 rounded-full border text-xs font-medium transition-all",
                      fillPeriod === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {fillLoading ? (
                <p className="text-xs text-muted-foreground py-2">Loading…</p>
              ) : shiftStats ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Avg. fill rate</span>
                    <span className="text-2xl font-bold">{shiftStats.avg_fill_rate}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-green-50 dark:bg-green-950/30 p-2">
                      <p className="text-base font-bold text-green-700 dark:text-green-300">{shiftStats.full_shifts}</p>
                      <p className="text-xs text-muted-foreground">Full</p>
                    </div>
                    <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-2">
                      <p className="text-base font-bold text-amber-700 dark:text-amber-300">{shiftStats.partial_shifts}</p>
                      <p className="text-xs text-muted-foreground">Partial</p>
                    </div>
                    <div className="rounded-md bg-muted/40 p-2">
                      <p className="text-base font-bold">{shiftStats.empty_shifts}</p>
                      <p className="text-xs text-muted-foreground">Empty</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-xs" asChild>
                    <Link href="/admin/reports/shift-analytics">
                      View full analytics <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No shift data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Popular Time Slots</CardTitle>
            </CardHeader>
            <CardContent>
              {popularSlots.length > 0 ? (
                <div className="divide-y">
                  {popularSlots.map((s: PopularSlot, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium">{s.slot}</p>
                        <p className="text-xs text-muted-foreground">{s.total_shifts} shifts · {s.total_volunteers} vol.</p>
                      </div>
                      <span className="text-sm font-bold tabular-nums">{s.avg_fill_rate}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity + exports side by side */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Recent Sign-ups</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                  <Link href="/admin/reports/attendance">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="divide-y">
                  {recentActivity.map((activity: RecentActivity) => (
                    <div key={activity.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{activity.volunteer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.shift_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {activity.slot}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap ml-3">{formatTimeAgo(activity.created_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Exports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" onClick={handleExportVolunteers} className="w-full justify-start gap-2 text-sm">
                <Download className="h-3.5 w-3.5" /> Volunteers CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportShiftReport} className="w-full justify-start gap-2 text-sm">
                <Download className="h-3.5 w-3.5" /> Shifts CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportAttendance} className="w-full justify-start gap-2 text-sm">
                <Download className="h-3.5 w-3.5" /> Attendance CSV
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </RequireAuth>
  )
}
