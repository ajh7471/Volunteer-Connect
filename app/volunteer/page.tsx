"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import RequireAuth from "@/app/components/RequireAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, TrendingUp, Loader2, ArrowRight, Award } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { ymd } from "@/lib/date"

type UpcomingShift = {
  id: string
  shift_date: string
  start_time: string
  end_time: string
  slot: string
}

export default function VolunteerDashboard() {
  const [loading, setLoading] = useState(true)
  const [upcomingShifts, setUpcomingShifts] = useState<UpcomingShift[]>([])
  const [stats, setStats] = useState({
    totalUpcoming: 0,
    thisMonth: 0,
    nextShift: null as UpcomingShift | null,
    totalCompletedShifts: 0,
    totalHoursWorked: 0,
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    if (!userId) {
      setLoading(false)
      return
    }

    const today = ymd(new Date())
    const startOfMonth = ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const endOfMonth = ymd(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))

    const { data: assignments } = await supabase
      .from("shift_assignments")
      .select(
        `
        id,
        shift_id,
        shifts (
          shift_date,
          start_time,
          end_time,
          slot
        )
      `,
      )
      .eq("user_id", userId)

    const { data: completedAssignments } = await supabase
      .from("shift_assignments")
      .select(
        `
        id,
        status,
        shifts (
          shift_date,
          start_time,
          end_time
        )
      `,
      )
      .eq("user_id", userId)
      .eq("status", "completed")

    let completedCount = 0
    let totalHours = 0

    if (completedAssignments) {
      completedAssignments.forEach((assignment: any) => {
        completedCount++

        const start = assignment.shifts?.start_time
        const end = assignment.shifts?.end_time
        if (start && end) {
          const [startHour, startMin] = start.split(":").map(Number)
          const [endHour, endMin] = end.split(":").map(Number)
          const hours = endHour - startHour + (endMin - startMin) / 60
          totalHours += hours
        }
      })
    }

    if (assignments) {
      const upcoming = assignments
        .filter((a: any) => a.shifts?.shift_date >= today)
        .map((a: any) => ({
          id: a.id,
          shift_date: a.shifts.shift_date,
          start_time: a.shifts.start_time,
          end_time: a.shifts.end_time,
          slot: a.shifts.slot,
        }))
        .sort((a, b) => a.shift_date.localeCompare(b.shift_date))

      setUpcomingShifts(upcoming.slice(0, 3))

      const thisMonthCount = upcoming.filter((s) => s.shift_date >= startOfMonth && s.shift_date <= endOfMonth).length

      setStats({
        totalUpcoming: upcoming.length,
        thisMonth: thisMonthCount,
        nextShift: upcoming[0] || null,
        totalCompletedShifts: completedCount,
        totalHoursWorked: Math.round(totalHours * 10) / 10,
      })
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <RequireAuth>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Volunteer Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your volunteer overview</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Browse Calendar</CardTitle>
              <CardDescription>Find and sign up for new volunteer shifts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/calendar">
                  <Calendar className="mr-2 h-4 w-4" />
                  View Calendar
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Schedule</CardTitle>
              <CardDescription>Manage your upcoming volunteer shifts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/my-schedule">
                  <Clock className="mr-2 h-4 w-4" />
                  View Schedule
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Shifts</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUpcoming}</div>
              <p className="text-xs text-muted-foreground">Total scheduled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisMonth}</div>
              <p className="text-xs text-muted-foreground">Shifts scheduled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Impact</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{stats.totalCompletedShifts}</span>
                  <span className="text-sm text-muted-foreground">shifts</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{stats.totalHoursWorked}</span>
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Shift</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stats.nextShift ? (
                <>
                  <div className="text-2xl font-bold">
                    {new Date(stats.nextShift.shift_date).toLocaleDateString("default", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.nextShift.start_time} - {stats.nextShift.end_time}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">No upcoming shifts</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {stats.nextShift && (
          <Card>
            <CardHeader>
              <CardTitle>Next Shift Preview</CardTitle>
              <CardDescription>Your upcoming volunteer shift</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {new Date(stats.nextShift.shift_date).toLocaleDateString("default", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <Badge>
                      {stats.nextShift.slot === "AM" && "Morning"}
                      {stats.nextShift.slot === "MID" && "Midday"}
                      {stats.nextShift.slot === "PM" && "Afternoon"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {stats.nextShift.start_time} - {stats.nextShift.end_time}
                    </span>
                  </div>
                </div>
                <Button asChild variant="outline">
                  <Link href="/my-schedule">View Details</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Shifts</CardTitle>
                <CardDescription>Your next volunteer shifts</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/my-schedule">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingShifts.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">No upcoming shifts scheduled</p>
                <Button asChild>
                  <Link href="/calendar">Browse Calendar</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingShifts.map((shift) => {
                  const date = new Date(shift.shift_date)
                  return (
                    <div key={shift.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {date.toLocaleDateString("default", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {shift.slot === "AM" && "Morning"}
                            {shift.slot === "MID" && "Midday"}
                            {shift.slot === "PM" && "Afternoon"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {shift.start_time} - {shift.end_time}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  )
}
