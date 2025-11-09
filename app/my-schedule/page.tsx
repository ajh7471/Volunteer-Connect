"use client"

import { useEffect, useState } from "react"
import RequireAuth from "@/app/components/RequireAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Loader2, Users, CalendarPlus } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { ymd } from "@/lib/date"
import { toast } from "@/lib/toast"
import Link from "next/link"
import { generateICS, downloadICS, type CalendarEvent } from "@/lib/calendar-export"
import { leaveWaitlist, acceptWaitlistSpot } from "@/app/admin/shift-management-actions"

type Assignment = {
  id: string
  shift_id: string
  shift_date: string
  slot: string
  start_time: string
  end_time: string
}

type WaitlistEntry = {
  id: string
  shift_id: string
  position: number
  status: string
  joined_at: string
  shift_date: string
  slot: string
  start_time: string
  end_time: string
}

export default function MySchedulePage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadAssignments()
  }, [])

  async function loadAssignments() {
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id

    if (!uid) {
      setLoading(false)
      return
    }

    setUserId(uid)

    // Get upcoming assignments
    const today = ymd(new Date())
    const { data, error } = await supabase
      .from("shift_assignments")
      .select(
        `
        id,
        shift_id,
        shifts (
          shift_date,
          slot,
          start_time,
          end_time
        )
      `,
      )
      .eq("user_id", uid)

    if (error) {
      console.error("[v0] Error loading assignments:", error)
      toast.error("Failed to load your schedule")
      setLoading(false)
      return
    }

    const formatted = (data || [])
      .filter((a: any) => a.shifts?.shift_date >= today)
      .map((a: any) => ({
        id: a.id,
        shift_id: a.shift_id,
        shift_date: a.shifts.shift_date,
        slot: a.shifts.slot,
        start_time: a.shifts.start_time,
        end_time: a.shifts.end_time,
      }))
      .sort((a, b) => a.shift_date.localeCompare(b.shift_date))

    setAssignments(formatted)

    await loadWaitlist(uid, today)

    setLoading(false)
  }

  async function loadWaitlist(uid: string, today: string) {
    const { data: waitlistData } = await supabase
      .from("shift_waitlist")
      .select(
        `
        id,
        shift_id,
        position,
        status,
        joined_at,
        shifts (
          shift_date,
          slot,
          start_time,
          end_time
        )
      `,
      )
      .eq("user_id", uid)
      .in("status", ["waiting", "notified"])

    if (waitlistData) {
      const formattedWaitlist = waitlistData
        .filter((w: any) => w.shifts?.shift_date >= today)
        .map((w: any) => ({
          id: w.id,
          shift_id: w.shift_id,
          position: w.position,
          status: w.status,
          joined_at: w.joined_at,
          shift_date: w.shifts.shift_date,
          slot: w.shifts.slot,
          start_time: w.shifts.start_time,
          end_time: w.shifts.end_time,
        }))
        .sort((a, b) => a.shift_date.localeCompare(b.shift_date))

      setWaitlistEntries(formattedWaitlist)
    }
  }

  async function handleCancel(assignmentId: string) {
    if (!confirm("Cancel your signup for this shift?")) return

    const { error } = await supabase.from("shift_assignments").delete().eq("id", assignmentId)

    if (error) {
      toast.error("Failed to cancel signup")
    } else {
      toast.success("Signup cancelled successfully")
      await loadAssignments()
    }
  }

  async function handleLeaveWaitlist(waitlistId: string) {
    if (!confirm("Leave the waitlist for this shift?")) return

    const result = await leaveWaitlist(waitlistId)

    if (result.success) {
      toast.success("Left waitlist successfully")
      await loadAssignments()
    } else {
      toast.error(result.error || "Failed to leave waitlist")
    }
  }

  async function handleAcceptWaitlist(waitlistId: string) {
    if (!confirm("Accept this shift? You will be added to the schedule.")) return

    const result = await acceptWaitlistSpot(waitlistId)

    if (result.success) {
      toast.success("Shift added to your schedule!")
      await loadAssignments()
    } else {
      toast.error(result.error || "Failed to accept shift")
    }
  }

  async function handleAddToCalendar(assignment: Assignment) {
    const event: CalendarEvent = {
      id: assignment.id,
      summary: `Volunteer Shift - ${assignment.slot === "AM" ? "Morning" : assignment.slot === "MID" ? "Midday" : "Afternoon"}`,
      description: `Your volunteer shift at Vanderpump Dogs.\n\nTime: ${assignment.start_time} - ${assignment.end_time}\nDate: ${new Date(assignment.shift_date).toLocaleDateString()}`,
      location: "Vanderpump Dogs, Los Angeles, CA",
      startDate: new Date(`${assignment.shift_date}T${assignment.start_time}`),
      endDate: new Date(`${assignment.shift_date}T${assignment.end_time}`),
    }

    const icsContent = generateICS([event])
    downloadICS(icsContent, `volunteer-shift-${assignment.shift_date}.ics`)
    toast.success("Calendar file downloaded! Open it to add to Gmail, Outlook, or any calendar app.")
  }

  async function handleAddAllToCalendar() {
    const events: CalendarEvent[] = assignments.map((assignment) => ({
      id: assignment.id,
      summary: `Volunteer Shift - ${assignment.slot === "AM" ? "Morning" : assignment.slot === "MID" ? "Midday" : "Afternoon"}`,
      description: `Your volunteer shift at Vanderpump Dogs.\n\nTime: ${assignment.start_time} - ${assignment.end_time}`,
      location: "Vanderpump Dogs, Los Angeles, CA",
      startDate: new Date(`${assignment.shift_date}T${assignment.start_time}`),
      endDate: new Date(`${assignment.shift_date}T${assignment.end_time}`),
    }))

    const icsContent = generateICS(events)
    downloadICS(icsContent, "vanderpump-volunteer-shifts.ics")
    toast.success("All shifts downloaded! Open the file to add to your calendar.")
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
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Schedule</h1>
            <p className="text-muted-foreground">View and manage your upcoming shifts</p>
          </div>
          <div className="flex gap-2">
            {assignments.length > 0 && (
              <Button variant="outline" onClick={handleAddAllToCalendar}>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Add All to Calendar
              </Button>
            )}
            <Button asChild>
              <Link href="/calendar">Browse Calendar</Link>
            </Button>
          </div>
        </div>

        {waitlistEntries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Waitlist
              </CardTitle>
              <CardDescription>Shifts you're waiting for</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {waitlistEntries.map((entry) => {
                  const date = new Date(entry.shift_date)
                  const dayOfWeek = date.toLocaleDateString("default", { weekday: "long" })
                  const monthDay = date.toLocaleDateString("default", { month: "short", day: "numeric" })

                  return (
                    <div key={entry.id} className="flex items-center justify-between border rounded-lg p-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {dayOfWeek}, {monthDay}
                          </span>
                          <Badge variant={entry.status === "notified" ? "default" : "secondary"}>
                            {entry.status === "notified"
                              ? `Spot Available! (Pos #${entry.position})`
                              : `Position #${entry.position}`}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {entry.start_time} - {entry.end_time}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {entry.status === "notified" && (
                          <Button size="sm" onClick={() => handleAcceptWaitlist(entry.id)}>
                            Accept Shift
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleLeaveWaitlist(entry.id)}>
                          Leave Waitlist
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assignments List */}
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium">No upcoming shifts</p>
              <p className="mb-4 text-sm text-muted-foreground">Sign up for shifts on the calendar to see them here</p>
              <Button asChild>
                <Link href="/calendar">View Calendar</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => {
              const date = new Date(assignment.shift_date)
              const dayOfWeek = date.toLocaleDateString("default", { weekday: "long" })
              const monthDay = date.toLocaleDateString("default", { month: "short", day: "numeric" })

              return (
                <Card key={assignment.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{dayOfWeek}</CardTitle>
                        <CardDescription>{monthDay}</CardDescription>
                      </div>
                      <Badge>
                        {assignment.slot === "AM" && "Morning"}
                        {assignment.slot === "MID" && "Midday"}
                        {assignment.slot === "PM" && "Afternoon"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {assignment.start_time} - {assignment.end_time}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent"
                      onClick={() => handleAddToCalendar(assignment)}
                    >
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      Add to Calendar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent"
                      onClick={() => handleCancel(assignment.id)}
                    >
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </RequireAuth>
  )
}
