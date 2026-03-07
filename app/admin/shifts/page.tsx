"use client"

import { useState, useEffect, useCallback, useTransition, useMemo } from "react"
import RequireAuth from "@/app/components/RequireAuth"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft, ChevronRight, Plus, Trash2, X, UserPlus,
  Loader2, AlertCircle, CheckCircle2, Users, CalendarDays, Clock, CalendarIcon,
} from "lucide-react"
import {
  getShiftsForRange, createSingleShift, deleteSingleShift, updateSingleShift,
  bulkCreateShifts, bulkDeleteShifts, bulkUpdateCapacity,
  assignShiftToUser, revokeShiftFromUser, getActiveVolunteers,
} from "@/app/admin/actions"
import { toast } from "@/lib/toast"
import { addMonths, ymd, isSameMonth, isSameDay, daysInGrid } from "@/lib/date"

// ─── Types ────────────────────────────────────────────────────────────────────

type Volunteer = { id: string; name: string; email: string }

type Assignment = {
  id: string
  user_id: string
  profiles: { id: string; name: string; email: string } | null
}

type Shift = {
  id: string
  shift_date: string
  slot: string
  start_time: string
  end_time: string
  capacity: number
  shift_assignments: Assignment[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOTS = ["AM", "MID", "PM"]
const SLOT_DEFAULTS: Record<string, { start: string; end: string; label: string }> = {
  AM:  { start: "09:00", end: "12:00", label: "Morning" },
  MID: { start: "12:00", end: "15:00", label: "Midday" },
  PM:  { start: "15:00", end: "17:00", label: "Evening" },
}
const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt12(time: string) {
  if (!time) return ""
  const [h, m] = time.split(":").map(Number)
  const ampm = h < 12 ? "AM" : "PM"
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`
}

function getCapacityStatus(capacity: number, assigned: number): "available" | "nearly-full" | "full" {
  if (assigned >= capacity) return "full"
  if (assigned >= capacity * 0.75) return "nearly-full"
  return "available"
}

// ─── ShiftIndicator (matches volunteer calendar style) ────────────────────────

function AdminShiftIndicator({
  slot,
  startTime,
  endTime,
  capacity,
  assignmentsCount,
  onClick,
}: {
  slot: string
  startTime: string
  endTime: string
  capacity: number
  assignmentsCount: number
  onClick: () => void
}) {
  const status = getCapacityStatus(capacity, assignmentsCount)

  const bgColor = {
    available: "bg-green-500",
    "nearly-full": "bg-orange-500",
    full: "bg-red-500",
  }[status]

  const slotLabel = {
    AM: "AM",
    MID: "MID",
    PM: "PM",
  }[slot] || slot

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`w-full ${bgColor} text-white text-xs rounded px-1.5 py-1 cursor-pointer hover:opacity-90 transition-opacity text-left`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-medium truncate">{slotLabel}</span>
        <span className="text-[10px] opacity-90 tabular-nums shrink-0">{assignmentsCount}/{capacity}</span>
      </div>
      <div className="text-[10px] opacity-80 truncate">
        {fmt12(startTime)} - {fmt12(endTime)}
      </div>
    </button>
  )
}

// ─── AdminDayCell (matches volunteer DayCell style) ───────────────────────────

function AdminDayCell({
  date,
  currentMonth,
  shifts,
  onDayClick,
  onShiftClick,
}: {
  date: Date
  currentMonth: Date
  shifts: Shift[]
  onDayClick: (date: Date) => void
  onShiftClick: (shift: Shift, slot: string, dateStr: string) => void
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const cellDate = new Date(date)
  cellDate.setHours(0, 0, 0, 0)

  const isToday = isSameDay(date, new Date())
  const isCurrentMonth = isSameMonth(date, currentMonth)
  const isPastDay = cellDate < today

  const dateStr = ymd(date)
  const dayShifts = shifts.filter((s) => s.shift_date === dateStr)

  const amShift = dayShifts.find((s) => s.slot === "AM")
  const midShift = dayShifts.find((s) => s.slot === "MID")
  const pmShift = dayShifts.find((s) => s.slot === "PM")

  return (
    <div
      className={`min-h-20 border-b border-r p-1 sm:min-h-24 sm:p-2 ${
        !isCurrentMonth ? "bg-muted/30" : "bg-background"
      } ${isToday ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""} ${
        isPastDay ? "bg-muted/50 opacity-60" : "hover:bg-accent"
      } transition-colors cursor-pointer`}
      onClick={() => onDayClick(date)}
    >
      <div
        className={`text-sm font-medium ${!isCurrentMonth || isPastDay ? "text-muted-foreground" : ""} ${isToday ? "text-primary font-bold" : ""}`}
      >
        {date.getDate()}
      </div>
      <div className="mt-1 space-y-1">
        {amShift && (
          <AdminShiftIndicator
            slot="AM"
            startTime={amShift.start_time}
            endTime={amShift.end_time}
            capacity={amShift.capacity}
            assignmentsCount={amShift.shift_assignments.length}
            onClick={() => onShiftClick(amShift, "AM", dateStr)}
          />
        )}
        {midShift && (
          <AdminShiftIndicator
            slot="MID"
            startTime={midShift.start_time}
            endTime={midShift.end_time}
            capacity={midShift.capacity}
            assignmentsCount={midShift.shift_assignments.length}
            onClick={() => onShiftClick(midShift, "MID", dateStr)}
          />
        )}
        {pmShift && (
          <AdminShiftIndicator
            slot="PM"
            startTime={pmShift.start_time}
            endTime={pmShift.end_time}
            capacity={pmShift.capacity}
            assignmentsCount={pmShift.shift_assignments.length}
            onClick={() => onShiftClick(pmShift, "PM", dateStr)}
          />
        )}
        {/* Show + button if day has no shifts and not past */}
        {!isPastDay && !amShift && !midShift && !pmShift && isCurrentMonth && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onShiftClick(null as any, "AM", dateStr)
            }}
            className="w-full text-muted-foreground/40 hover:text-primary/60 transition-colors flex items-center justify-center py-2"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── AdminMonthlyGrid (matches volunteer MonthlyGrid) ─────────────────────────

function AdminMonthlyGrid({
  currentMonth,
  shifts,
  onDayClick,
  onShiftClick,
}: {
  currentMonth: Date
  shifts: Shift[]
  onDayClick: (date: Date) => void
  onShiftClick: (shift: Shift | null, slot: string, dateStr: string) => void
}) {
  const days = daysInGrid(currentMonth)

  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b bg-muted">
        {WEEKDAYS.map((day, i) => (
          <div key={day} className="p-2 text-center text-sm font-semibold">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden" aria-hidden="true">{WEEKDAYS_SHORT[i]}</span>
            <span className="sr-only sm:hidden">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((date, index) => (
          <AdminDayCell
            key={index}
            date={date}
            currentMonth={currentMonth}
            shifts={shifts}
            onDayClick={onDayClick}
            onShiftClick={onShiftClick}
          />
        ))}
      </div>
    </div>
  )
}

// ─── ShiftSheet (admin controls) ──────────────────────────────────────────────

function ShiftSheet({
  open, shift, slot, dateStr, volunteers, onClose, onRefresh, onCreate,
}: {
  open: boolean
  shift: Shift | null
  slot: string
  dateStr: string
  volunteers: Volunteer[]
  onClose: () => void
  onRefresh: () => void
  onCreate: (dateStr: string, slot: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [assigningId, setAssigningId] = useState("")
  const [editingCapacity, setEditingCapacity] = useState(false)
  const [newCapacity, setNewCapacity] = useState(shift?.capacity?.toString() ?? "3")
  const [startTime, setStartTime] = useState(shift?.start_time ?? SLOT_DEFAULTS[slot]?.start ?? "09:00")
  const [endTime, setEndTime] = useState(shift?.end_time ?? SLOT_DEFAULTS[slot]?.end ?? "12:00")
  const [capacity, setCapacity] = useState(shift?.capacity?.toString() ?? "2")
  const [createSlot, setCreateSlot] = useState(slot)

  useEffect(() => {
    setNewCapacity(shift?.capacity?.toString() ?? "2")
    setStartTime(shift?.start_time ?? SLOT_DEFAULTS[slot]?.start ?? "09:00")
    setEndTime(shift?.end_time ?? SLOT_DEFAULTS[slot]?.end ?? "12:00")
    setCapacity(shift?.capacity?.toString() ?? "2")
    setCreateSlot(slot)
    setEditingCapacity(false)
    setAssigningId("")
  }, [shift, slot])

  const assigned = shift?.shift_assignments ?? []
  const unassigned = volunteers.filter((v) => !assigned.some((a) => a.user_id === v.id))

  const displayDate = dateStr ? new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }) : ""

  const handleCreate = () => {
    startTransition(async () => {
      const res = await createSingleShift({
        shift_date: dateStr,
        slot: createSlot,
        start_time: startTime,
        end_time: endTime,
        capacity: parseInt(capacity) || 2,
      })
      if (res.success) {
        toast.success("Shift created")
        onRefresh()
        onClose()
      } else {
        toast.error(res.error || "Failed to create shift")
      }
    })
  }

  const handleDelete = () => {
    if (!shift) return
    startTransition(async () => {
      const res = await deleteSingleShift(shift.id)
      if (res.success) {
        toast.success("Shift deleted")
        onRefresh()
        onClose()
      } else {
        toast.error(res.error || "Failed to delete")
      }
    })
  }

  const handleUpdateCapacity = () => {
    if (!shift) return
    const val = parseInt(newCapacity)
    if (val < assigned.length) {
      toast.error(`Cannot reduce below ${assigned.length} (current assignments)`)
      return
    }
    startTransition(async () => {
      const res = await updateSingleShift(shift.id, { capacity: val })
      if (res.success) {
        toast.success("Capacity updated")
        setEditingCapacity(false)
        onRefresh()
      } else {
        toast.error(res.error || "Failed")
      }
    })
  }

  const handleAssign = () => {
    if (!shift || !assigningId) return
    startTransition(async () => {
      const res = await assignShiftToUser(assigningId, shift.id)
      if (res.success) {
        toast.success("Volunteer assigned")
        setAssigningId("")
        onRefresh()
      } else {
        toast.error(res.error || "Failed")
      }
    })
  }

  const handleRemove = (assignmentId: string, name: string) => {
    startTransition(async () => {
      const res = await revokeShiftFromUser(assignmentId)
      if (res.success) {
        toast.success(`${name} removed`)
        onRefresh()
      } else {
        toast.error(res.error || "Failed")
      }
    })
  }

  const handleSlotChange = (s: string) => {
    setCreateSlot(s)
    setStartTime(SLOT_DEFAULTS[s]?.start ?? "09:00")
    setEndTime(SLOT_DEFAULTS[s]?.end ?? "12:00")
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left pb-4 border-b">
          <SheetTitle className="text-lg">
            {shift ? `${SLOT_DEFAULTS[shift.slot]?.label || shift.slot} Shift` : "Create Shift"}
          </SheetTitle>
          <SheetDescription>{displayDate}</SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Create new shift */}
          {!shift && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Time Slot</Label>
                <Select value={createSlot} onValueChange={handleSlotChange}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SLOT_DEFAULTS[s].label} ({s})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Start Time</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-sm">End Time</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label className="text-sm">Volunteer Capacity</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="mt-1.5 w-24"
                />
              </div>
              <Button onClick={handleCreate} disabled={isPending} className="w-full">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Shift
              </Button>
            </div>
          )}

          {/* Existing shift */}
          {shift && (
            <>
              {/* Time display */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{fmt12(shift.start_time)} – {fmt12(shift.end_time)}</p>
                  <p className="text-sm text-muted-foreground">
                    {Math.max(0, parseInt(shift.end_time) - parseInt(shift.start_time))} hours
                  </p>
                </div>
              </div>

              {/* Capacity */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold">Capacity</Label>
                  {!editingCapacity && (
                    <button
                      onClick={() => {
                        setNewCapacity(shift.capacity.toString())
                        setEditingCapacity(true)
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {editingCapacity ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={newCapacity}
                      onChange={(e) => setNewCapacity(e.target.value)}
                      className="w-24"
                    />
                    <Button size="sm" onClick={handleUpdateCapacity} disabled={isPending}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingCapacity(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        assigned.length >= shift.capacity
                          ? "destructive"
                          : assigned.length >= shift.capacity * 0.75
                            ? "secondary"
                            : "default"
                      }
                    >
                      {assigned.length}/{shift.capacity}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {assigned.length} of {shift.capacity} spots filled
                    </span>
                  </div>
                )}
              </div>

              {/* Assigned volunteers */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">Assigned Volunteers ({assigned.length})</Label>
                </div>
                {assigned.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">No volunteers assigned yet</p>
                ) : (
                  <ul className="space-y-2">
                    {assigned.map((a) => (
                      <li key={a.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 group">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{a.profiles?.name ?? "Unknown"}</p>
                          <p className="text-sm text-muted-foreground truncate">{a.profiles?.email ?? ""}</p>
                        </div>
                        <button
                          onClick={() => handleRemove(a.id, a.profiles?.name ?? "Volunteer")}
                          disabled={isPending}
                          className="ml-3 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                          aria-label="Remove volunteer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Assign volunteer */}
              {assigned.length < shift.capacity && unassigned.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-semibold">Add Volunteer</Label>
                  </div>
                  <div className="flex gap-2">
                    <Select value={assigningId} onValueChange={setAssigningId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select volunteer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unassigned.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            <span className="font-medium">{v.name}</span>
                            <span className="text-muted-foreground ml-2 text-sm">{v.email}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAssign} disabled={!assigningId || isPending}>
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                    </Button>
                  </div>
                </div>
              )}

              {assigned.length >= shift.capacity && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="text-sm">Shift is at full capacity</span>
                </div>
              )}

              {/* Delete */}
              <div className="pt-4 border-t">
                <Button variant="destructive" className="w-full" onClick={handleDelete} disabled={isPending}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Shift
                  {assigned.length > 0 && ` (removes ${assigned.length} assignment${assigned.length > 1 ? "s" : ""})`}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── CalendarTab (monthly view like volunteer) ────────────────────────────────

function CalendarTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [selected, setSelected] = useState<{ shift: Shift | null; slot: string; dateStr: string } | null>(null)

  const monthName = useMemo(
    () => currentMonth.toLocaleString("default", { month: "long", year: "numeric" }),
    [currentMonth],
  )

  const loadMonthData = useCallback(async () => {
    setLoading(true)

    // Calculate month range
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    // Extend to full weeks for the grid
    const gridStart = new Date(firstDay)
    gridStart.setDate(gridStart.getDate() - gridStart.getDay())
    const gridEnd = new Date(lastDay)
    gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()))

    const startDate = ymd(gridStart)
    const endDate = ymd(gridEnd)

    const [shiftsRes, volsRes] = await Promise.all([
      getShiftsForRange(startDate, endDate),
      getActiveVolunteers(),
    ])

    if (shiftsRes.success) {
      setShifts((shiftsRes.shifts as unknown as Shift[]) || [])
    }
    if (volsRes.success) {
      setVolunteers((volsRes.volunteers as Volunteer[]) || [])
    }
    setLoading(false)
  }, [currentMonth])

  useEffect(() => {
    loadMonthData()
  }, [loadMonthData])

  const handlePrevMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1))
    setSelected(null)
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
    setSelected(null)
  }

  const handleDayClick = (date: Date) => {
    // Open create shift sheet for this date
    setSelected({ shift: null, slot: "AM", dateStr: ymd(date) })
  }

  const handleShiftClick = (shift: Shift | null, slot: string, dateStr: string) => {
    setSelected({ shift, slot, dateStr })
  }

  const handleRefresh = async () => {
    await loadMonthData()
    // Update selected shift if still selected
    if (selected?.shift) {
      const updatedShift = shifts.find((s) => s.id === selected.shift?.id)
      if (updatedShift) {
        setSelected({ ...selected, shift: updatedShift })
      }
    }
  }

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Month navigation */}
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-semibold">{monthName}</span>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="flex flex-wrap gap-x-4 gap-y-2 py-3 px-4">
            {[
              { color: "bg-green-500", label: "Available" },
              { color: "bg-orange-500", label: "Nearly Full" },
              { color: "bg-red-500", label: "Full" },
              { color: "bg-gray-300 dark:bg-gray-600", label: "Not Available" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`h-3 w-6 rounded-sm ${color}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Calendar grid */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <AdminMonthlyGrid
            currentMonth={currentMonth}
            shifts={shifts}
            onDayClick={handleDayClick}
            onShiftClick={handleShiftClick}
          />
        )}
      </div>

      {/* Shift detail sheet */}
      <ShiftSheet
        open={!!selected}
        shift={selected?.shift ?? null}
        slot={selected?.slot ?? "AM"}
        dateStr={selected?.dateStr ?? ""}
        volunteers={volunteers}
        onClose={() => setSelected(null)}
        onRefresh={handleRefresh}
        onCreate={(dateStr, slot) => setSelected({ shift: null, slot, dateStr })}
      />
    </>
  )
}

// ─── BulkOpsTab ───────────────────────────────────────────────────────────────

function BulkOpsTab({ onRefresh }: { onRefresh: () => void }) {
  const [isPending, startTransition] = useTransition()

  // Create form
  const [cSlot, setCSlot] = useState("AM")
  const [cStart, setCStart] = useState("09:00")
  const [cEnd, setCEnd] = useState("12:00")
  const [cCapacity, setCCapacity] = useState("2")
  const [cDateStart, setCDateStart] = useState("")
  const [cDateEnd, setCDateEnd] = useState("")
  const [cDays, setCDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [cPreview, setCPreview] = useState<number | null>(null)
  const [cResult, setCResult] = useState<string | null>(null)

  // Delete form
  const [dDateStart, setDDateStart] = useState("")
  const [dDateEnd, setDDateEnd] = useState("")
  const [dSlot, setDSlot] = useState("all")
  const [dOnlyEmpty, setDOnlyEmpty] = useState(true)
  const [dResult, setDResult] = useState<string | null>(null)

  // Capacity form
  const [uDateStart, setUDateStart] = useState("")
  const [uDateEnd, setUDateEnd] = useState("")
  const [uSlot, setUSlot] = useState("all")
  const [uCapacity, setUCapacity] = useState("2")
  const [uResult, setUResult] = useState<string | null>(null)

  const computePreview = () => {
    if (!cDateStart || !cDateEnd || cDays.length === 0) {
      setCPreview(0)
      return
    }
    let count = 0
    const cur = new Date(cDateStart + "T00:00:00")
    const end = new Date(cDateEnd + "T00:00:00")
    while (cur <= end) {
      if (cDays.includes(cur.getDay())) count++
      cur.setDate(cur.getDate() + 1)
    }
    setCPreview(count)
  }

  const toggleDay = (d: number) =>
    setCDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))

  const handleSlotChange = (s: string) => {
    setCSlot(s)
    setCStart(SLOT_DEFAULTS[s]?.start ?? "09:00")
    setCEnd(SLOT_DEFAULTS[s]?.end ?? "12:00")
  }

  const handleCreate = () => {
    if (!cDateStart || !cDateEnd) {
      toast.error("Select a date range")
      return
    }
    if (cDays.length === 0) {
      toast.error("Select at least one day of week")
      return
    }
    startTransition(async () => {
      setCResult(null)
      const res = await bulkCreateShifts({
        slot: cSlot,
        startTime: cStart,
        endTime: cEnd,
        capacity: parseInt(cCapacity) || 2,
        startDate: cDateStart,
        endDate: cDateEnd,
        daysOfWeek: cDays,
      })
      if (res.success) {
        setCResult(`Created ${res.created} shifts, skipped ${res.skipped} existing`)
        onRefresh()
      } else {
        toast.error(res.error || "Failed")
      }
    })
  }

  const handleDelete = () => {
    if (!dDateStart || !dDateEnd) {
      toast.error("Select a date range")
      return
    }
    startTransition(async () => {
      setDResult(null)
      const res = await bulkDeleteShifts({
        startDate: dDateStart,
        endDate: dDateEnd,
        slot: dSlot === "all" ? undefined : dSlot,
        onlyEmpty: dOnlyEmpty,
      })
      if (res.success) {
        setDResult(`Deleted ${res.deleted} shifts, skipped ${res.skipped}`)
        onRefresh()
      } else {
        toast.error(res.error || "Failed")
      }
    })
  }

  const handleCapacity = () => {
    if (!uDateStart || !uDateEnd) {
      toast.error("Select a date range")
      return
    }
    startTransition(async () => {
      setUResult(null)
      const res = await bulkUpdateCapacity({
        startDate: uDateStart,
        endDate: uDateEnd,
        slot: uSlot === "all" ? undefined : uSlot,
        capacity: parseInt(uCapacity) || 2,
      })
      if (res.success) {
        setUResult(`Updated ${res.updated} shifts`)
        onRefresh()
      } else {
        toast.error(res.error || "Failed")
      }
    })
  }

  const ResultBanner = ({ msg }: { msg: string }) => (
    <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      {msg}
    </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create Recurring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-5 w-5 text-primary" />
              Create Recurring Shifts
            </CardTitle>
            <CardDescription>Generate shifts for multiple days at once</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Time Slot</Label>
              <Select value={cSlot} onValueChange={handleSlotChange}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SLOT_DEFAULTS[s].label} ({s})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={cStart} onChange={(e) => setCStart(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={cEnd} onChange={(e) => setCEnd(e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Capacity</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={cCapacity}
                onChange={(e) => setCCapacity(e.target.value)}
                className="mt-1.5 w-24"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From Date</Label>
                <Input type="date" value={cDateStart} onChange={(e) => setCDateStart(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>To Date</Label>
                <Input type="date" value={cDateEnd} onChange={(e) => setCDateEnd(e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Days of Week</Label>
              <div className="flex flex-wrap gap-1.5">
                {DOW_LABELS.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={[
                      "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                      cDays.includes(i)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/60",
                    ].join(" ")}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            {cPreview !== null && (
              <p className="text-sm text-muted-foreground">
                Will create <span className="font-semibold text-foreground">{cPreview}</span> shifts
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={computePreview} className="flex-1">
                Preview
              </Button>
              <Button onClick={handleCreate} disabled={isPending} className="flex-1">
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create
              </Button>
            </div>
            {cResult && <ResultBanner msg={cResult} />}
          </CardContent>
        </Card>

        {/* Bulk Delete */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trash2 className="h-5 w-5 text-destructive" />
              Bulk Delete Shifts
            </CardTitle>
            <CardDescription>Remove multiple shifts by date range</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From Date</Label>
                <Input type="date" value={dDateStart} onChange={(e) => setDDateStart(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>To Date</Label>
                <Input type="date" value={dDateEnd} onChange={(e) => setDDateEnd(e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Slot Filter</Label>
              <Select value={dSlot} onValueChange={setDSlot}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Slots</SelectItem>
                  {SLOTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SLOT_DEFAULTS[s].label} ({s})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-start gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={dOnlyEmpty}
                onChange={(e) => setDOnlyEmpty(e.target.checked)}
                className="rounded mt-0.5"
              />
              <span className="text-sm">Only delete shifts with no assignments</span>
            </label>
            {!dOnlyEmpty && (
              <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                All volunteer assignments will also be removed.
              </div>
            )}
            <Button variant="destructive" onClick={handleDelete} disabled={isPending} className="w-full">
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Shifts
            </Button>
            {dResult && <ResultBanner msg={dResult} />}
          </CardContent>
        </Card>

        {/* Bulk Capacity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" />
              Update Capacity
            </CardTitle>
            <CardDescription>Change capacity for multiple shifts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From Date</Label>
                <Input type="date" value={uDateStart} onChange={(e) => setUDateStart(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>To Date</Label>
                <Input type="date" value={uDateEnd} onChange={(e) => setUDateEnd(e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Slot Filter</Label>
              <Select value={uSlot} onValueChange={setUSlot}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Slots</SelectItem>
                  {SLOTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SLOT_DEFAULTS[s].label} ({s})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>New Capacity</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={uCapacity}
                onChange={(e) => setUCapacity(e.target.value)}
                className="mt-1.5 w-24"
              />
            </div>
            <Button onClick={handleCapacity} disabled={isPending} className="w-full">
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Apply to Shifts
            </Button>
            {uResult && <ResultBanner msg={uResult} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminShiftsPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <RequireAuth>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shift Management</h1>
          <p className="text-muted-foreground">Create shifts, assign volunteers, and manage your schedule</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Bulk Operations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-0">
            <CalendarTab key={refreshKey} />
          </TabsContent>

          <TabsContent value="bulk" className="mt-0">
            <BulkOpsTab onRefresh={() => setRefreshKey((k) => k + 1)} />
          </TabsContent>
        </Tabs>
      </div>
    </RequireAuth>
  )
}
