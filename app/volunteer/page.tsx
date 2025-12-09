"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import RequireAuth from "@/app/components/RequireAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Loader2, ArrowRight, Award } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { ymd, parseDate, formatTime12Hour } from "@/lib/date"
import useSWR from "swr"

type UpcomingShift = {
  id: string
  shift_date: string
  start_time: string
  end_time: string
  slot: string
}

type AssignmentData = {
  id: string
  shift_id: string
  shifts: {
    shift_date: string
    start_time: string
    end_time: string
    slot: string
  } | null
}

async function fetchDashboardData(userId: string) {
  const { data, error } = await supabase
    .from("shift_assignments")
    .select(`
      id,
      shift_id,
      shifts (
        shift_date,
        start_time,
        end_time,
        slot
      )
    `)
    .eq("user_id", userId)

  if (error) throw error
  return data || []
}

function DashboardContent() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id || null)
    })
  }, [])

  const { data: assignments = [], isLoading } = useSWR(
    userId ? `dashboard-${userId}` : null,
    () => fetchDashboardData(userId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 second cache
    },
  )

  const { upcomingShifts, thisMonthShifts, stats } = useMemo(() => {
    const today = ymd(new Date())
    const startOfMonth = ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const endOfMonth = ymd(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))

    let completedCount = 0
    let totalHours = 0
    const upcoming: UpcomingShift[] = []

    assignments.forEach((assignment: AssignmentData) => {
      if (!assignment.shifts) return

      const shiftDate = assignment.shifts.shift_date

      if (shiftDate < today) {
        completedCount++
        const start = assignment.shifts.start_time
        const end = assignment.shifts.end_time
        if (start && end) {
          const [startHour, startMin] = start.split(":").map(Number)
          const [endHour, endMin] = end.split(":").map(Number)
          const hours = endHour - startHour + (endMin - startMin) / 60
          totalHours += hours
        }
      } else {
        upcoming.push({
          id: assignment.id,
          shift_date: shiftDate,
          start_time: assignment.shifts.start_time,
          end_time: assignment.shifts.end_time,
          slot: assignment.shifts.slot,
        })
      }
    })

    upcoming.sort((a, b) => a.shift_date.localeCompare(b.shift_date))

    const thisMonth = upcoming.filter((s: UpcomingShift) => s.shift_date >= startOfMonth && s.shift_date <= endOfMonth)

    return {
      upcomingShifts: upcoming.slice(0, 3),
      thisMonthShifts: thisMonth,
      stats: {
        totalUpcoming: upcoming.length,
        thisMonth: thisMonth.length,
        nextShift: upcoming[0] || null,
        totalCompletedShifts: completedCount,
        totalHoursWorked: Math.round(totalHours * 10) / 10,
      },
    }
  }, [assignments])

  if (isLoading || !userId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Total Impact
          </CardTitle>
          <CardDescription>Your complete volunteering journey and contributions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Shifts Completed</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{stats.totalCompletedShifts}</span>
                <span className="text-lg text-muted-foreground">shifts</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Hours Volunteered</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{stats.totalHoursWorked}</span>
                <span className="text-lg text-muted-foreground">hours</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Shifts This Month
              </CardTitle>
              <CardDescription>
                {stats.thisMonth === 0
                  ? "No shifts scheduled for this month"
                  : `${stats.thisMonth} ${stats.thisMonth === 1 ? "shift" : "shifts"} scheduled in ${new Date().toLocaleDateString("default", { month: "long" })}`}
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/my-schedule">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {thisMonthShifts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                You don't have any shifts scheduled for this month yet
              </p>
              <Button asChild>
                <Link href="/calendar">
                  <Calendar className="mr-2 h-4 w-4" />
                  Browse Calendar
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {thisMonthShifts.map((shift: UpcomingShift) => {
                const date = parseDate(shift.shift_date)
                const isNextShift = stats.nextShift?.id === shift.id
                const today = new Date()
                const isToday = date.toDateString() === today.toDateString()

                return (
                  <div
                    key={shift.id}
                    className={`flex items-center justify-between border rounded-lg p-4 transition-colors ${
                      isNextShift ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center bg-muted rounded-lg p-3 min-w-[64px]">
                        <span className="text-2xl font-bold leading-none">
                          {date.toLocaleDateString("default", { day: "numeric" })}
                        </span>
                        <span className="text-xs text-muted-foreground uppercase mt-1">
                          {date.toLocaleDateString("default", { month: "short" })}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {date.toLocaleDateString("default", {
                              weekday: "long",
                            })}
                          </span>
                          {isToday && (
                            <Badge variant="default" className="text-xs">
                              Today
                            </Badge>
                          )}
                          {isNextShift && !isToday && (
                            <Badge variant="default" className="text-xs">
                              Next Shift
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {shift.slot === "AM" && "Morning"}
                            {shift.slot === "MID" && "Midday"}
                            {shift.slot === "PM" && "Afternoon"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatTime12Hour(shift.start_time)} - {formatTime12Hour(shift.end_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                      <Link href="/my-schedule">Details</Link>
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VolunteerDashboard() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  )
}
