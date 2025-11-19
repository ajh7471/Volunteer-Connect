"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import RequireAuth from "@/app/components/RequireAuth"
import { MonthlyGrid } from "@/components/calendar/MonthlyGrid"
import { ShiftModal } from "@/components/calendar/ShiftModal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, CalendarIcon, Loader2, Clock, Users } from 'lucide-react'
import { addMonths, ymd, parseDate } from "@/lib/date"
import { getMonthShifts, signUpForShift, type ShiftWithCapacity, getCapacityStatus } from "@/lib/shifts"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "@/lib/toast"
import { joinWaitlist } from "@/app/admin/shift-management-actions"
import Link from "next/link"
import { AssignmentWithRelations } from "@/types/database"

export default function CalendarPage() {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [shifts, setShifts] = useState<ShiftWithCapacity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedShift, setSelectedShift] = useState<ShiftWithCapacity | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userAssignments, setUserAssignments] = useState<Set<string>>(new Set())
  const [signingUpShifts, setSigningUpShifts] = useState<Set<string>>(new Set())
  const [shiftAttendees, setShiftAttendees] = useState<Record<string, Array<{ name: string | null; id: string }>>>({})
  const [loadingAttendees, setLoadingAttendees] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    loadMonthData()
  }, [currentMonth, userId]) // Added userId dependency to reload data when user is authenticated

  async function loadUser() {
    const { data } = await supabase.auth.getUser()
    setUserId(data.user?.id || null)
  }

  async function loadMonthData() {
    setLoading(true)

    // Fetch shifts for the month
    const monthShifts = await getMonthShifts(currentMonth.getFullYear(), currentMonth.getMonth())
    setShifts(monthShifts)

    // Load user's assignments for these shifts
    if (userId) {
      const shiftIds = monthShifts.map((s: ShiftWithCapacity) => s.id)
      if (shiftIds.length > 0) {
        const { data } = await supabase
          .from("shift_assignments")
          .select("shift_id")
          .eq("user_id", userId)
          .in("shift_id", shiftIds)

        if (data) {
          setUserAssignments(new Set(data.map((a: { shift_id: string }) => a.shift_id)))
        } else {
          setUserAssignments(new Set())
        }
      } else {
        setUserAssignments(new Set())
      }
    }

    setLoading(false)
  }

  function handlePrevMonth() {
    setCurrentMonth(addMonths(currentMonth, -1))
    setSelectedDate(null)
  }

  function handleNextMonth() {
    setCurrentMonth(addMonths(currentMonth, 1))
    setSelectedDate(null)
  }

  function handleDayClick(date: Date) {
    setSelectedDate(date)
  }

  function handleShiftClick(shift: ShiftWithCapacity) {
    setSelectedShift(shift)
    setIsModalOpen(true)
    // Pre-load attendees when opening modal
    loadShiftAttendees(shift.id)
  }

  async function loadShiftAttendees(shiftId: string) {
    if (shiftAttendees[shiftId] || loadingAttendees.has(shiftId)) return

    setLoadingAttendees((prev) => new Set(prev).add(shiftId))

    const { data, error } = await supabase
      .from("shift_assignments")
      .select(
        `
        user_id,
        profiles (
          name,
          id
        )
      `,
      )
      .eq("shift_id", shiftId)

    if (error) {
      console.error("[v0] Error loading shift attendees:", error)
    }

    const attendeesList =
      !error && data
        ? (data as AssignmentWithRelations[])
            .map((a: AssignmentWithRelations) => {
              // Improved safety check for profiles relation and filtering
              if (!a.profiles) return null
              return {
                name: a.profiles.name || "Unknown",
                id: a.profiles.id || "",
              }
            })
            .filter((item): item is { name: string; id: string } => item !== null)
        : []

    setShiftAttendees((prev) => ({
      ...prev,
      [shiftId]: attendeesList,
    }))

    setLoadingAttendees((prev) => {
      const newSet = new Set(prev)
      newSet.delete(shiftId)
      return newSet
    })
  }

  async function handleSignUp(shiftId: string) {
    if (!userId) return

    setSigningUpShifts((prev) => new Set(prev).add(shiftId))

    const result = await signUpForShift(shiftId, userId)

    if (result.success) {
      toast.success("Successfully signed up for shift!")
      await loadMonthData()
      // Update selected shift data if modal is open
      if (selectedShift && selectedShift.id === shiftId) {
        // We need to refresh the selected shift data from the new shifts array
        // But loadMonthData updates 'shifts' state asynchronously.
        // For now, we'll just close the modal or let the user see the update on next render if we could sync it.
        // Actually, since we await loadMonthData, 'shifts' should be updated? 
        // No, state updates are batched/async. 
        // But we can just close it for a simple UX, or keep it open.
        // Let's keep it open but we need to update the 'selectedShift' object to reflect new counts.
        // We'll handle that in a useEffect or just close it.
        // Closing it is safer to avoid stale data display.
        setIsModalOpen(false)
      }
      setSelectedDate(null)
    } else {
      toast.error(result.error || "Failed to sign up")
    }

    setSigningUpShifts((prev) => {
      const newSet = new Set(prev)
      newSet.delete(shiftId)
      return newSet
    })
  }

  async function handleRemoveFromShift(shiftId: string) {
    if (!userId) return
    if (!confirm("Are you sure you want to remove yourself from this shift?")) return

    setSigningUpShifts((prev) => new Set(prev).add(shiftId))

    // Find assignment ID first
    const { data } = await supabase
      .from("shift_assignments")
      .select("id")
      .eq("shift_id", shiftId)
      .eq("user_id", userId)
      .single()

    if (data) {
      const { error } = await supabase.from("shift_assignments").delete().eq("id", data.id)

      if (error) {
        toast.error("Failed to cancel signup")
      } else {
        toast.success("Signup cancelled successfully")
        await loadMonthData()
        setIsModalOpen(false)
        setSelectedDate(null)
      }
    } else {
      toast.error("Assignment not found")
    }

    setSigningUpShifts((prev) => {
      const newSet = new Set(prev)
      newSet.delete(shiftId)
      return newSet
    })
  }

  async function handleCancel(assignmentId: string) {
    if (!confirm("Cancel your signup for this shift?")) return

    const { error } = await supabase.from("shift_assignments").delete().eq("id", assignmentId)

    if (error) {
      toast.error("Failed to cancel signup")
    } else {
      toast.success("Signup cancelled successfully")
      await loadMonthData()
      setSelectedDate(null)
    }
  }

  async function handleJoinWaitlist(shiftId: string) {
    if (!userId) return

    setSigningUpShifts((prev) => new Set(prev).add(shiftId))

    const result = await joinWaitlist(shiftId)

    if (result.success) {
      toast.success(`Joined waitlist! You're position #${result.position}`)
      await loadMonthData()
      setIsModalOpen(false)
    } else {
      toast.error(result.error || "Failed to join waitlist")
    }

    setSigningUpShifts((prev) => {
      const newSet = new Set(prev)
      newSet.delete(shiftId)
      return newSet
    })
  }

  const selectedDateShifts = selectedDate
    ? shifts.filter((s: ShiftWithCapacity) => {
        if (s.shift_date !== ymd(selectedDate)) return false

        const now = new Date()
        const shiftDate = parseDate(s.shift_date)
        const [hours, minutes] = s.end_time.split(":").map(Number)
        const shiftEndTime = new Date(
          shiftDate.getFullYear(),
          shiftDate.getMonth(),
          shiftDate.getDate(),
          hours,
          minutes,
        )

        return shiftEndTime > now
      })
    : []

  const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" })

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Volunteer Calendar</h1>
            <p className="text-muted-foreground">View available shifts and sign up</p>
          </div>
          <Button asChild>
            <Link href="/my-schedule">View My Schedule</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-semibold">{monthName}</span>
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Shift Status Legend</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-12 rounded bg-green-500"></div>
              <span className="text-sm">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-12 rounded bg-orange-500"></div>
              <span className="text-sm">Nearly Full</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-12 rounded bg-red-500"></div>
              <span className="text-sm">Full</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-12 rounded bg-gray-300"></div>
              <span className="text-sm">Not Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-12 rounded bg-blue-600"></div>
              <span className="text-sm">Registered</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {loading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : (
              <MonthlyGrid 
                currentMonth={currentMonth} 
                shifts={shifts} 
                userAssignments={userAssignments}
                onDayClick={handleDayClick} 
                onShiftClick={handleShiftClick}
              />
            )}
          </div>

          <div className="lg:col-span-1">
            {selectedDate ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedDate.toLocaleDateString("default", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardTitle>
                  <CardDescription>
                    {selectedDateShifts.length === 0
                      ? "No shifts scheduled"
                      : `${selectedDateShifts.length} shift(s) available`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedDateShifts.length === 0 && (
                    <p className="text-sm text-muted-foreground">No shifts have been created for this date yet.</p>
                  )}

                  {selectedDateShifts.map((shift: ShiftWithCapacity) => {
                    const status = getCapacityStatus(shift.capacity, shift.assignments_count)
                    const isAssigned = userAssignments.has(shift.id)
                    const isFull = status === "full"
                    const isSigningUp = signingUpShifts.has(shift.id)
                    const attendees = shiftAttendees[shift.id]
                    const isLoadingAttendees = loadingAttendees.has(shift.id)
                    const hasLoadedAttendees = attendees !== undefined

                    return (
                      <div key={shift.id} className="rounded-lg border p-4 space-y-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {shift.start_time} - {shift.end_time}
                            </span>
                          </div>
                          <Badge
                            variant={
                              status === "available"
                                ? "default"
                                : status === "nearly-full"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className="text-xs"
                          >
                            {shift.assignments_count}/{shift.capacity}
                          </Badge>
                        </div>

                        {shift.assignments_count > 0 && (
                          <div className="space-y-2 border-t pt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start gap-2 h-auto py-2 px-2"
                              onClick={() => loadShiftAttendees(shift.id)}
                              disabled={isLoadingAttendees}
                            >
                              <Users className="h-4 w-4 text-primary" />
                              <span className="text-xs font-medium">
                                {hasLoadedAttendees
                                  ? `${attendees.length} volunteer${attendees.length !== 1 ? "s" : ""} on your team`
                                  : `View team (${shift.assignments_count} volunteer${shift.assignments_count !== 1 ? "s" : ""})`}
                              </span>
                            </Button>

                            {isLoadingAttendees && (
                              <div className="flex items-center justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              </div>
                            )}

                            {hasLoadedAttendees && !isLoadingAttendees && (
                              <div className="space-y-1 bg-muted/30 rounded-md p-2">
                                {attendees.length === 0 ? (
                                  <div className="text-center py-2">
                                    <Users className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                                    <p className="text-xs text-muted-foreground">
                                      No volunteers signed up yet. Be the first!
                                    </p>
                                  </div>
                                ) : attendees.length === 1 && attendees[0].id === userId ? (
                                  <div className="text-center py-3">
                                    <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                                    <p className="text-xs font-medium mb-1">You're currently the only volunteer!</p>
                                    <p className="text-xs text-muted-foreground">
                                      Invite a friend to join you for this shift
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Team Members:</p>
                                    {attendees.map((attendee) => (
                                      <div key={attendee.id} className="text-xs flex items-center gap-2 py-1">
                                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                                        <span className="font-medium">
                                          {attendee.id === userId ? `${attendee.name} (You)` : attendee.name}
                                        </span>
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          {isAssigned ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full bg-transparent"
                              onClick={(e) => {
                                e.stopPropagation()
                                supabase
                                  .from("shift_assignments")
                                  .select("id")
                                  .eq("shift_id", shift.id)
                                  .eq("user_id", userId!)
                                  .single()
                                  .then(({ data }: { data: { id: string } | null }) => {
                                    if (data) handleCancel(data.id)
                                  })
                              }}
                            >
                              Remove from Shift
                            </Button>
                          ) : isFull ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full"
                              disabled={isSigningUp}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleJoinWaitlist(shift.id)
                              }}
                            >
                              {isSigningUp ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Joining...
                                </>
                              ) : (
                                "Join Waitlist"
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full"
                              disabled={isSigningUp}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSignUp(shift.id)
                              }}
                            >
                              {isSigningUp ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Signing up...
                                </>
                              ) : (
                                "Add to My Shifts"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Click on a date to view and manage shifts</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <ShiftModal
        shift={selectedShift}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
        isAssigned={selectedShift ? userAssignments.has(selectedShift.id) : false}
        isSigningUp={selectedShift ? signingUpShifts.has(selectedShift.id) : false}
        attendees={selectedShift ? shiftAttendees[selectedShift.id] : undefined}
        isLoadingAttendees={selectedShift ? loadingAttendees.has(selectedShift.id) : false}
        onSignUp={handleSignUp}
        onCancel={handleRemoveFromShift}
        onJoinWaitlist={handleJoinWaitlist}
        onLoadAttendees={loadShiftAttendees}
      />
    </RequireAuth>
  )
}
