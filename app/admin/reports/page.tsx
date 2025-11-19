"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import RequireAuth from "@/app/components/RequireAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Users, TrendingUp, Download, FileText, BarChart, Clock, ArrowRight } from 'lucide-react'
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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [shiftStats, setShiftStats] = useState<ShiftStatistics | null>(null)
  const [popularSlots, setPopularSlots] = useState<PopularSlot[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
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

      // Load all data in parallel with error handling
      const results = await Promise.allSettled([
        getDashboardStats(),
        getShiftStatistics(startDate, endDate),
        getPopularTimeSlots(),
        getRecentActivity(10),
      ])

      const [statsRes, shiftStatsRes, slotsRes, activityRes] = results

      if (statsRes.status === "fulfilled" && statsRes.value.success) {
        setDashboardStats(statsRes.value.data)
      }

      if (shiftStatsRes.status === "fulfilled" && shiftStatsRes.value.success) {
        setShiftStats(shiftStatsRes.value.data || null)
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/admin/reports/attendance")}>
            <CardHeader>
              <Clock className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Attendance Report</CardTitle>
              <CardDescription>Track volunteer hours and shift attendance history</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-between">
                View Report
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/admin/reports/shift-analytics")}>
            <CardHeader>
              <BarChart className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Shift Analytics</CardTitle>
              <CardDescription>Analyze shift fill rates and capacity utilization</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-between">
                View Analytics
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Download className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Quick Exports</CardTitle>
              <CardDescription>Download data in CSV format</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" onClick={handleExportVolunteers} className="w-full">
                Export Volunteers
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportShiftReport} className="w-full">
                Export Shifts
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportAttendance} className="w-full">
                Export Attendance
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
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
                      {popularSlots.map((slot: PopularSlot, idx: number) => (
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
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest volunteer sign-ups</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((activity: RecentActivity) => (
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
        </Tabs>
      </div>
    </RequireAuth>
  )
}
