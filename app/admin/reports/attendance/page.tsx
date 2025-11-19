"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import RequireAuth from "@/app/components/RequireAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Download, User, Clock, TrendingUp } from 'lucide-react'
import { supabase } from "@/lib/supabaseClient"
import {
  getVolunteerAttendance,
  calculateVolunteerHours,
  exportAttendanceCSV,
  type AttendanceRecord,
  type VolunteerHours,
} from "../../reporting-actions"
import Link from "next/link"

export default function AttendanceReportPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [volunteers, setVolunteers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [selectedVolunteer, setSelectedVolunteer] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [volunteerHours, setVolunteerHours] = useState<VolunteerHours | null>(null)
  const [loading, setLoading] = useState(false)

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
        loadVolunteers()
      } else {
        setIsAdmin(false)
      }
    })()
  }, [])

  async function loadVolunteers() {
    const { data } = await supabase.from("profiles").select("id, name, email").order("name")

    if (data) {
      setVolunteers(data)
    }
  }

  async function loadAttendanceReport() {
    if (!selectedVolunteer || !startDate || !endDate) return

    setLoading(true)

    const [attendanceResult, hoursResult] = await Promise.all([
      getVolunteerAttendance(selectedVolunteer, startDate, endDate),
      calculateVolunteerHours(selectedVolunteer, startDate, endDate),
    ])

    if (attendanceResult.success) {
      setAttendance(attendanceResult.data || [])
    }

    if (hoursResult.success) {
      setVolunteerHours(hoursResult.data || null)
    }

    setLoading(false)
  }

  async function handleExport() {
    const result = await exportAttendanceCSV(selectedVolunteer || undefined, startDate, endDate)
    if (result.success && result.csv) {
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `attendance_report_${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  function formatHours(totalHours: number): string {
    const hours = Math.floor(totalHours)
    const minutes = Math.round((totalHours - hours) * 60)
    return `${hours}h ${minutes}m`
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
            <h1 className="text-3xl font-bold tracking-tight">Attendance Report</h1>
            <p className="text-muted-foreground">Track volunteer hours and shift attendance</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/admin/reports">Back to Reports</Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
            <CardDescription>Select volunteer and date range</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Volunteer</label>
                <Select value={selectedVolunteer} onValueChange={setSelectedVolunteer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select volunteer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Volunteers</SelectItem>
                    {volunteers.map((v: { id: string; name: string; email: string }) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name || v.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

              <div className="flex items-end gap-2">
                <Button onClick={loadAttendanceReport} disabled={loading || !selectedVolunteer} className="flex-1">
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {volunteerHours && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatHours(volunteerHours.total_hours)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{volunteerHours.shift_count}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Hours/Shift</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {volunteerHours.shift_count > 0
                    ? formatHours(volunteerHours.total_hours / volunteerHours.shift_count)
                    : "0h 0m"}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>
                  {attendance.length > 0 ? `${attendance.length} record(s) found` : "No records to display"}
                </CardDescription>
              </div>
              {attendance.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading attendance data...</div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Select a volunteer and date range to view attendance records
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time Slot</TableHead>
                      <TableHead>Volunteer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record: AttendanceRecord) => (
                      <TableRow key={record.assignment_id}>
                        <TableCell>{new Date(record.shift_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {record.start_time} - {record.end_time} ({record.slot})
                        </TableCell>
                        <TableCell className="font-medium">{record.volunteer_name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === "Completed"
                                ? "default"
                                : record.status === "Today"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{record.hours.toFixed(1)}h</TableCell>
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
