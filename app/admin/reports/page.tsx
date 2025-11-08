"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import RequireAuth from "@/app/components/RequireAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Users, TrendingUp, Download, FileText, BarChart } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
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

export default function ReportsPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [shiftStats, setShiftStats] = useState<ShiftStatistics | null>(null)
  const [popularSlots, setPopularSlots] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Check admin role
  useEffect(() => {
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const uid = user?.id
      if (!uid) {
        setIsAdmin(false)
        return
      }

      const { data } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle()

      if (data?.role === "admin") {
        setIsAdmin(true)
        loadData()
      } else {
        setIsAdmin(false)
      }
    })()
  }, [])

  async function loadData() {
    try {
      setLoading(true)

      // Get date ranges
      const today = new Date()
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const startDate = thirtyDaysAgo.toISOString().split("T")[0]
      const endDate = today.toISOString().split("T")[0]

      // Load all data in parallel
      const [statsRes, shiftStatsRes, slotsRes, activityRes] = await Promise.all([
        getDashboardStats(),
        getShiftStatistics(startDate, endDate),
        getPopularTimeSlots(),
        getRecentActivity(10),
      ])

      if (statsRes.success) setDashboardStats(statsRes.data)
      if (shiftStatsRes.success) setShiftStats(shiftStatsRes.data || null)
      if (slotsRes.success) setPopularSlots(slotsRes.data || [])
      if (activityRes.success) setRecentActivity(activityRes.data || [])
    } catch (error) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground">Volunteer activity and shift statistics</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/admin">Back to Dashboard</Link>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volunteers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.totalVolunteers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.totalShifts || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.totalAssignments || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.activeThisMonth || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="shifts">Shift Analytics</TabsTrigger>
            <TabsTrigger value="exports">Export Data</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Shift Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Shift Fill Rates (Last 30 Days)</CardTitle>
                  <CardDescription>Overall capacity utilization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {shiftStats ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Average Fill Rate</span>
                        <span className="text-2xl font-bold">{shiftStats.avg_fill_rate}%</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Full Shifts</span>
                          <span className="font-medium">{shiftStats.full_shifts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Partial Shifts</span>
                          <span className="font-medium">{shiftStats.partial_shifts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Empty Shifts</span>
                          <span className="font-medium">{shiftStats.empty_shifts}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No shift data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Popular Time Slots */}
              <Card>
                <CardHeader>
                  <CardTitle>Popular Time Slots</CardTitle>
                  <CardDescription>Most requested shift times</CardDescription>
                </CardHeader>
                <CardContent>
                  {popularSlots.length > 0 ? (
                    <div className="space-y-3">
                      {popularSlots.map((slot, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{slot.slot}</p>
                            <p className="text-xs text-muted-foreground">
                              {slot.total_shifts} shifts, {slot.total_volunteers} volunteers
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{slot.avg_fill_rate}%</p>
                            <p className="text-xs text-muted-foreground">fill rate</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest volunteer sign-ups</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                        <div>
                          <p className="font-medium">{activity.volunteer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Signed up for {new Date(activity.shift_date).toLocaleDateString()} - {activity.slot}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.created_at)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shift Analytics Tab */}
          <TabsContent value="shifts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Shift Analytics</CardTitle>
                <CardDescription>Coming soon: Charts and detailed breakdowns</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Advanced shift analytics with charts and trends will be available in the next update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="exports" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <Download className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle>Export Volunteers</CardTitle>
                  <CardDescription>Download complete volunteer roster</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleExportVolunteers} className="w-full">
                    Download CSV
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <BarChart className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle>Export Shift Report</CardTitle>
                  <CardDescription>Last 30 days of shift data</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleExportShiftReport} className="w-full">
                    Download CSV
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <FileText className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle>Export Attendance</CardTitle>
                  <CardDescription>Complete attendance records</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleExportAttendance} className="w-full">
                    Download CSV
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RequireAuth>
  )
}
