"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import RequireAuth from "@/app/components/RequireAuth"
import { MonthlyGrid } from "@/components/calendar/MonthlyGrid"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, CalendarIcon, Loader2, Clock } from "lucide-react"
import { addMonths, ymd } from "@/lib/date"
import { getMonthShifts, signUpForShift, type ShiftWithCapacity, getCapacityStatus } from "@/lib/shifts"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "@/lib/toast"
import { joinWaitlist } from "@/app/admin/shift-management-actions"

export default function CalendarPage() {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [shifts, setShifts] = useState<ShiftWithCapacity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userAssignments, setUserAssignments] = useState<Set<string>>(new Set())
  const [signingUp, setSigningUp] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    loadMonthData()
  }, [currentMonth])

  async function loadUser() {
    const { data } = await supabase.auth.getUser()
    setUserId(data.user?.id || null)
  }

  async function loadMonthData() {
    setLoading(true)

    const monthShifts = await getMonthShifts(currentMonth.getFullYear(), currentMonth.getMonth())
    setShifts(monthShifts)

    // Load user's assignments for this month
    if (userId) {
      const startDate = ymd(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1))
      const endDate = ymd(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0))

      const { data } = await supabase.from("shift_assignments").select("shift_id").eq("user_id", userId)

      if (data) {
        setUserAssignments(new Set(data.map((a) => a.shift_id)))
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

  async function handleSignUp(shiftId: string) {
    if (!userId) return

    setSigningUp(true)
    const result = await signUpForShift(shiftId, userId)

    if (result.success) {
      toast.success("Successfully signed up for shift!")
      await loadMonthData()
      setSelectedDate(null)
    } else {
      toast.error(result.error || "Failed to sign up")
    }

    setSigningUp(false)
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

    setSigningUp(true)
    const result = await joinWaitlist(shiftId)

    if (result.success) {
      toast.success(`Joined waitlist! You're position #${result.position}`)
      await loadMonthData()
    } else {
      toast.error(result.error || "Failed to join waitlist")
    }

    setSigningUp(false)
  }

  // Get shifts for selected date
  const selectedDateShifts = selectedDate ? shifts.filter((s) => s.shift_date === ymd(selectedDate)) : []

  const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" })

  return (
    <RequireAuth>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Volunteer Calendar</h1>
          <p className="text-muted-foreground">View available shifts and sign up</p>
        </div>

        {/* Month Navigation */}
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

        {/* Legend */}
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
              <span className="text-sm">No Shift</span>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid and Details Panel */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            {loading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : (
              <MonthlyGrid currentMonth={currentMonth} shifts={shifts} onDayClick={handleDayClick} />
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

                  {/* Display shifts in a clean single-line format per shift */}
                  {selectedDateShifts.map((shift) => {
                    const status = getCapacityStatus(shift.capacity, shift.assignments_count)
                    const isAssigned = userAssignments.has(shift.id)
                    const isFull = status === "full"
                    const isPast = new Date(shift.shift_date) < new Date()

                    return (
                      <div
                        key={shift.id}
                        className="rounded-lg border p-4 space-y-3 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          // Allow clicking on the card to interact with the shift
                          if (!isPast && !isAssigned && !isFull) {
                            handleSignUp(shift.id)
                          }
                        }}
                      >
                        {/* Single line showing shift time and status */}
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

                        {/* Action buttons */}
                        {!isPast && (
                          <div className="flex gap-2">
                            {isAssigned ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full bg-transparent"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Find assignment ID and cancel
                                  supabase
                                    .from("shift_assignments")
                                    .select("id")
                                    .eq("shift_id", shift.id)
                                    .eq("user_id", userId!)
                                    .single()
                                    .then(({ data }) => {
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
                                disabled={signingUp}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleJoinWaitlist(shift.id)
                                }}
                              >
                                {signingUp ? (
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
                                disabled={signingUp}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSignUp(shift.id)
                                }}
                              >
                                {signingUp ? (
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
                        )}

                        {isPast && (
                          <p className="text-xs text-center text-muted-foreground italic">This shift has passed</p>
                        )}
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
    </RequireAuth>
  )
}
