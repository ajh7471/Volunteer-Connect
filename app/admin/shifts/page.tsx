"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import RequireAuth from "@/app/components/RequireAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, Trash2, UserPlus, AlertCircle, Loader2 } from 'lucide-react'
import { ymd, formatTime12Hour } from "@/lib/date"
import Link from "next/link"
import { toast } from "@/lib/toast"

type Shift = {
  id: string
  shift_date: string
  slot: string
  start_time: string
  end_time: string
  capacity: number
}

type Assignment = {
  id: string
  shift_id: string
  user_id: string
  created_at: string
  profiles: {
    name: string | null
    phone: string | null
  }
}

type Volunteer = {
  id: string
  name: string | null
  phone: string | null
  active: boolean | null
}

const SLOT_ORDER = { AM: 0, MID: 1, PM: 2 }

export default function AdminShiftsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(ymd(new Date()))
  const [shifts, setShifts] = useState<Shift[]>([])
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>({})
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [loading, setLoading] = useState(true)
  const [seedingMonth, setSeedingMonth] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedDate])

  async function loadData() {
    setLoading(true)

    // Load shifts for selected date
    const { data: shiftsData } = await supabase
      .from("shifts")
      .select("*")
      .eq("shift_date", selectedDate)
      .order("slot", { ascending: true })

    if (shiftsData) {
      const sorted = shiftsData.sort(
        (a: Shift, b: Shift) => SLOT_ORDER[a.slot as keyof typeof SLOT_ORDER] - SLOT_ORDER[b.slot as keyof typeof SLOT_ORDER],
      )
      setShifts(sorted)

      // Parallelize fetching assignments and volunteers
      const shiftIds = sorted.map((s: Shift) => s.id)
      
      const [assignResult, volResult] = await Promise.all([
        shiftIds.length > 0 
          ? supabase
              .from("shift_assignments")
              .select("*, profiles(name, phone)")
              .in("shift_id", shiftIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from("profiles")
          .select("id, name, phone, active")
          .or("active.is.null,active.eq.true")
          .order("name", { ascending: true })
      ])

      // Process assignments
      if (assignResult.data) {
        const grouped: Record<string, Assignment[]> = {}
        assignResult.data.forEach((a: Assignment) => {
          if (!grouped[a.shift_id]) grouped[a.shift_id] = []
          grouped[a.shift_id].push(a)
        })
        setAssignments(grouped)
      } else {
        setAssignments({})
      }

      // Process volunteers
      if (volResult.data) {
        setVolunteers(volResult.data as Volunteer[])
      }
    } else {
      // Even if no shifts, we might want to load volunteers? 
      // Probably not needed if no shifts to assign to.
      setShifts([])
      setAssignments({})
      
      // Still load volunteers in case they want to seed and then assign immediately?
      // The original code loaded volunteers regardless of shifts existence (it was outside the if(shiftsData) block? No, it was after.)
      // Wait, original code:
      // if (shiftsData) { ... }
      // const { data: volData } = await supabase...
      // So volunteers were loaded even if no shifts.
      
      const { data: volData } = await supabase
        .from("profiles")
        .select("id, name, phone, active")
        .or("active.is.null,active.eq.true")
        .order("name", { ascending: true })
        
      if (volData) {
        setVolunteers(volData as Volunteer[])
      }
    }

    setLoading(false)
  }

  async function seedCurrentMonth() {
    setSeedingMonth(true)
    const date = new Date(selectedDate)
    const startDate = ymd(new Date(date.getFullYear(), date.getMonth(), 1))
    const endDate = ymd(new Date(date.getFullYear(), date.getMonth() + 1, 0))

    const { error } = await supabase.rpc("seed_shifts_range", {
      start_date: startDate,
      end_date: endDate,
    })

    if (error) {
      toast.error(`Failed to seed month: ${error.message}`)
    } else {
      toast.success("Month seeded successfully!")
      await loadData()
    }

    setSeedingMonth(false)
  }

  async function addVolunteerToShift(shiftId: string, userId: string) {
    const shift = shifts.find((s) => s.id === shiftId)
    if (!shift) return

    const currentAssignments = assignments[shiftId] || []
    if (currentAssignments.length >= shift.capacity) {
      toast.error("This shift is already at full capacity")
      return
    }

    // Check if volunteer already assigned
    if (currentAssignments.some((a) => a.user_id === userId)) {
      toast.error("This volunteer is already assigned to this shift")
      return
    }

    const { error } = await supabase.from("shift_assignments").insert({
      shift_id: shiftId,
      user_id: userId,
    })

    if (error) {
      toast.error(`Failed to assign volunteer: ${error.message}`)
    } else {
      toast.success("Volunteer assigned successfully")
      await loadData()
    }
  }

  async function removeAssignment(assignmentId: string, volunteerName: string) {
    if (!confirm(`Remove ${volunteerName} from this shift?`)) return

    const { error } = await supabase.from("shift_assignments").delete().eq("id", assignmentId)

    if (error) {
      toast.error(`Failed to remove assignment: ${error.message}`)
    } else {
      toast.success("Volunteer removed successfully")
      await loadData()
    }
  }

  async function updateCapacity(shiftId: string, newCapacity: number) {
    const currentAssignments = (assignments[shiftId] || []).length

    if (newCapacity < currentAssignments) {
      toast.error(`Cannot reduce capacity below current assignments (${currentAssignments})`)
      return
    }

    const { error } = await supabase.from("shifts").update({ capacity: newCapacity }).eq("id", shiftId)

    if (error) {
      toast.error(`Failed to update capacity: ${error.message}`)
    } else {
      toast.success("Capacity updated successfully")
      await loadData()
    }
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Shifts</h1>
            <p className="text-muted-foreground">Assign volunteers and manage shift capacity</p>
          </div>
          <Button asChild>
            <Link href="/admin">Back to Dashboard</Link>
          </Button>
        </div>

        {/* Date Picker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Date
            </CardTitle>
            <CardDescription>Choose a date to view and manage shifts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />

              {shifts.length === 0 && !loading && (
                <Button onClick={seedCurrentMonth} disabled={seedingMonth} variant="outline">
                  {seedingMonth ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Seeding...
                    </>
                  ) : (
                    "Seed This Month"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Loading shifts...</p>
            </CardContent>
          </Card>
        )}

        {/* No Shifts Warning */}
        {!loading && shifts.length === 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <CardContent className="flex items-center gap-3 py-6">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-100">No shifts found for this date</p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Use the "Seed This Month" button to create shifts for the entire month.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Shifts List */}
        {!loading &&
          shifts.map((shift: Shift) => {
            const currentAssignments = assignments[shift.id] || []
            const availableSlots = shift.capacity - currentAssignments.length

            return (
              <Card key={shift.id}>
                <CardHeader>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <CardTitle className="text-xl">
                        {shift.slot === "AM" && "Morning Shift"}
                        {shift.slot === "MID" && "Midday Shift"}
                        {shift.slot === "PM" && "Afternoon Shift"}
                      </CardTitle>
                      <CardDescription>
                        {formatTime12Hour(shift.start_time)} - {formatTime12Hour(shift.end_time)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Capacity:</span>
                      <Select
                        value={String(shift.capacity)}
                        onValueChange={(val) => updateCapacity(shift.id, Number.parseInt(val))}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n: number) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge variant={availableSlots === 0 ? "destructive" : "default"}>
                        {currentAssignments.length} / {shift.capacity} filled
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Assigned Volunteers */}
                  {currentAssignments.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Assigned Volunteers:</p>
                      <div className="space-y-2">
                        {currentAssignments.map((assignment: Assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between rounded-lg border bg-card p-3"
                          >
                            <div>
                              <p className="font-medium">{assignment.profiles.name || "Unnamed Volunteer"}</p>
                              <p className="text-sm text-muted-foreground">{assignment.profiles.phone || "No phone"}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAssignment(assignment.id, assignment.profiles.name || "Unnamed")}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Volunteer */}
                  {availableSlots > 0 && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                      <Select onValueChange={(userId) => addVolunteerToShift(shift.id, userId)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Add volunteer to this shift..." />
                        </SelectTrigger>
                        <SelectContent>
                          {volunteers
                            .filter((v: Volunteer) => !currentAssignments.some((a: Assignment) => a.user_id === v.id))
                            .map((volunteer: Volunteer) => (
                              <SelectItem key={volunteer.id} value={volunteer.id}>
                                {volunteer.name || "Unnamed"} {volunteer.phone ? `(${volunteer.phone})` : ""}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {availableSlots === 0 && (
                    <p className="text-sm text-muted-foreground">This shift is at full capacity.</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
      </div>
    </RequireAuth>
  )
}
