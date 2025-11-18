"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import RequireAuth from "@/app/components/RequireAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Download, TrendingUp, AlertCircle, CheckCircle, Users } from 'lucide-react'
import { supabase } from "@/lib/supabaseClient"
import {
  getShiftFillRates,
  getShiftStatistics,
  exportShiftReportCSV,
  type ShiftFillRate,
  type ShiftStatistics,
} from "../../reporting-actions"
import Link from "next/link"

export default function ShiftAnalyticsPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [fillRates, setFillRates] = useState<ShiftFillRate[]>([])
  const [statistics, setStatistics] = useState<ShiftStatistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>("all")

  // Set default date range (last 30 days)
  useEffect(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    setStartDate(thirtyDaysAgo.toISOString().split("T")[0])
    setEndDate(today.toISOString().split("T")[0])
  }, [])

  // Check admin role
  useEffect(() => {
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setIsAdmin(false)
        return
      }

      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()

      if (data?.role === "admin") {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    })()
  }, [])

  async function loadShiftAnalytics() {
    if (!startDate || !endDate) return

    setLoading(true)

    const [fillRatesResult, statsResult] = await Promise.all([
      getShiftFillRates(startDate, endDate),
      getShiftStatistics(startDate, endDate),
    ])

    if (fillRatesResult.success) {
      setFillRates(fillRatesResult.data || [])
    }

    if (statsResult.success) {
      setStatistics(statsResult.data || null)
    }

    setLoading(false)
  }

  async function handleExport() {
    const result = await exportShiftReportCSV(startDate, endDate)
    if (result.success && result.csv) {
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `shift_report_${startDate}_to_${endDate}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const filteredFillRates = fillRates.filter((shift) => {
    if (filterStatus === "all") return true
    return shift.fill_status.toLowerCase() === filterStatus.toLowerCase()
  })

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
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shift Analytics</h1>
            <p className="text-muted-foreground">Analyze shift fill rates and capacity utilization</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/admin/reports">Back to Reports</Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
            <CardDescription>Select date range to analyze</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All Shifts</option>
                  <option value="full">Full</option>
                  <option value="partial">Partial</option>
                  <option value="empty">Empty</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button onClick={loadShiftAnalytics} disabled={loading} className="w-full">
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {statistics && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Fill Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.avg_fill_rate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {statistics.total_filled} / {statistics.total_capacity} spots filled
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Full Shifts</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.full_shifts}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {statistics.total_shifts > 0
                    ? Math.round((statistics.full_shifts / statistics.total_shifts) * 100)
                    : 0}
                  % of total shifts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Partial Shifts</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.partial_shifts}</div>
                <p className="text-xs text-muted-foreground mt-1">Need more volunteers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Empty Shifts</CardTitle>
                <Users className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.empty_shifts}</div>
                <p className="text-xs text-muted-foreground mt-1">Require attention</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Shift Fill Rates Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Shift Fill Rates</CardTitle>
                <CardDescription>
                  {filteredFillRates.length > 0
                    ? `${filteredFillRates.length} shift(s) found`
                    : "No shifts to display"}
                </CardDescription>
              </div>
              {filteredFillRates.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading shift analytics...</div>
            ) : filteredFillRates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Select a date range to view shift analytics
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time Slot</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Filled</TableHead>
                      <TableHead>Fill Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Volunteers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFillRates.map((shift) => (
                      <TableRow key={shift.shift_id}>
                        <TableCell>{new Date(shift.shift_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {shift.start_time} - {shift.end_time} ({shift.slot})
                        </TableCell>
                        <TableCell>{shift.capacity}</TableCell>
                        <TableCell>{shift.filled_count}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  shift.fill_rate_percent >= 100
                                    ? "bg-green-600"
                                    : shift.fill_rate_percent >= 50
                                      ? "bg-orange-500"
                                      : "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(shift.fill_rate_percent, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{shift.fill_rate_percent}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              shift.fill_status === "Full"
                                ? "default"
                                : shift.fill_status === "Partial"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {shift.fill_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                          {shift.volunteer_names || "None"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  )
}
