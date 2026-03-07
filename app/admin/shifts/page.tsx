"use client"

import { useState, useEffect, useCallback, useTransition, useMemo } from "react"
import RequireAuth from "@/app/components/RequireAuth"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ChevronLeft, ChevronRight, Plus, Trash2, X, UserPlus,
  Loader2, AlertCircle, CheckCircle2, Users, CalendarDays, Clock, CalendarIcon,
  Repeat, Calendar as CalendarSimple,
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
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"]

const RECURRENCE_PATTERNS = [
  { value: "none", label: "One-time shift", desc: "Single date only" },
  { value: "daily", label: "Every day", desc: "All days in range" },
  { value: "weekdays", label: "Weekdays only", desc: "Mon-Fri" },
  { value: "weekends", label: "Weekends only", desc: "Sat-Sun" },
  { value: "weekly", label: "Weekly", desc: "Same day each week" },
  { value: "biweekly", label: "Every other week", desc: "Bi-weekly pattern" },
  { value: "monthly", label: "Monthly", desc: "Same date each month" },
  { value: "custom", label: "Custom days", desc: "Pick specific days" },
]

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

function computeRecurrenceDates(
  pattern: string,
  startDate: string,
  endDate: string,
  customDays: number[],
  baseDay?: number, // day of week from startDate
): string[] {
  if (!startDate) return []
  const dates: string[] = []
  const cur = new Date(startDate + "T00:00:00")
  const end = endDate ? new Date(endDate + "T00:00:00") : new Date(startDate + "T00:00:00")
  const dayOfWeek = baseDay ?? cur.getDay()
  let weekCount = 0

  while (cur <= end) {
    const dow = cur.getDay()
    const dateStr = cur.toISOString().split("T")[0]
    let include = false

    switch (pattern) {
      case "none":
        include = cur.getTime() === new Date(startDate + "T00:00:00").getTime()
        break
      case "daily":
        include = true
        break
      case "weekdays":
        include = dow >= 1 && dow <= 5
        break
      case "weekends":
        include = dow === 0 || dow === 6
        break
      case "weekly":
        include = dow === dayOfWeek
        break
      case "biweekly":
        if (dow === dayOfWeek) {
          include = weekCount % 2 === 0
          weekCount++
        }
        break
      case "monthly":
        include = cur.getDate() === new Date(startDate + "T00:00:00").getDate()
        break
      case "custom":
        include = customDays.includes(dow)
        break
    }

    if (include) dates.push(dateStr)
    cur.setDate(cur.getDate() + 1)
  }

  return dates
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
              onDayClick(date)
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

// ─── EditShiftSheet (view/edit existing shift) ────────────────────────────────

function EditShiftSheet({
  open,
  shift,
  volunteers,
  onClose,
  onRefresh,
}: {
  open: boolean
  shift: Shift | null
  volunteers: Volunteer[]
  onClose: () => void
  onRefresh: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [assigningId, setAssigningId] = useState("")
  const [editingCapacity, setEditingCapacity] = useState(false)
  const [newCapacity, setNewCapacity] = useState("")

  useEffect(() => {
    if (shift) {
      setNewCapacity(shift.capacity.toString())
      setEditingCapacity(false)
      setAssigningId("")
    }
  }, [shift])

  if (!shift) return null

  const assigned = shift.shift_assignments ?? []
  const unassigned = volunteers.filter((v) => !assigned.some((a) => a.user_id === v.id))

  const displayDate = new Date(shift.shift_date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })

  const handleDelete = () => {
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
    if (!assigningId) return
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

  const capacityStatus = getCapacityStatus(shift.capacity, assigned.length)
  const fillPct = shift.capacity > 0 ? Math.min(Math.round((assigned.length / shift.capacity) * 100), 100) : 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header — matches ShiftModal style */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b">
          <DialogTitle className="text-base font-semibold">
            {SLOT_DEFAULTS[shift.slot]?.label || shift.slot} Shift
          </DialogTitle>
          <DialogDescription className="sr-only">
            Edit shift details, manage volunteers, or delete this shift.
          </DialogDescription>
          <p className="text-sm text-muted-foreground">{displayDate}</p>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="px-5 py-4 space-y-5">
            {/* Date + time block — matches ShiftModal's info block */}
            <div className="flex flex-col gap-2 rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>{displayDate}</span>
                <Badge
                  variant={
                    capacityStatus === "available" ? "default"
                    : capacityStatus === "nearly-full" ? "secondary"
                    : "destructive"
                  }
                  className="ml-auto text-xs"
                >
                  {capacityStatus === "available" ? "Available" : capacityStatus === "nearly-full" ? "Nearly Full" : "Full"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{fmt12(shift.start_time)} – {fmt12(shift.end_time)} ({shift.slot})</span>
                </div>
                <span className="text-muted-foreground text-xs">{assigned.length}/{shift.capacity} filled</span>
              </div>
            </div>

            {/* Capacity bar + inline edit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Capacity
                </span>
                {!editingCapacity && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => { setNewCapacity(shift.capacity.toString()); setEditingCapacity(true) }}
                  >
                    Edit
                  </Button>
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
                    className="w-20 h-8 text-sm"
                  />
                  <Button size="sm" className="h-8 text-xs" onClick={handleUpdateCapacity} disabled={isPending}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingCapacity(false)}>Cancel</Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={
                        capacityStatus === "full" ? "h-full bg-primary rounded-full"
                        : capacityStatus === "nearly-full" ? "h-full bg-amber-500 rounded-full"
                        : "h-full bg-primary/50 rounded-full"
                      }
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{assigned.length} of {shift.capacity} spots filled</p>
                </div>
              )}
            </div>

            {/* Volunteers list — matches ShiftModal's volunteer section */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Volunteers ({assigned.length})
              </p>
              <div className="rounded-lg border bg-card shadow-sm">
                <div className="p-3 space-y-1.5 max-h-[180px] overflow-y-auto">
                  {assigned.length === 0 ? (
                    <p className="text-center py-3 text-sm text-muted-foreground italic">No volunteers assigned yet</p>
                  ) : (
                    assigned.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 text-sm group">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                          {(a.profiles?.name || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium truncate">{a.profiles?.name ?? "Unknown"}</span>
                          <span className="text-xs text-muted-foreground truncate">{a.profiles?.email ?? ""}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive shrink-0"
                          onClick={() => handleRemove(a.id, a.profiles?.name ?? "Volunteer")}
                          disabled={isPending}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Add volunteer */}
            {assigned.length < shift.capacity && unassigned.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" /> Add Volunteer
                </p>
                <div className="flex gap-2">
                  <Select value={assigningId} onValueChange={setAssigningId}>
                    <SelectTrigger className="flex-1 h-9 text-sm">
                      <SelectValue placeholder="Select volunteer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unassigned.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          <span className="font-medium">{v.name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{v.email}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAssign} disabled={!assigningId || isPending} className="h-9 text-sm px-4">
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
                  </Button>
                </div>
              </div>
            )}

            {assigned.length >= shift.capacity && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Shift is at full capacity</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer — delete + close */}
        <div className="px-5 py-3 border-t flex gap-2 bg-background">
          <Button variant="outline" size="sm" className="flex-1 h-9 text-sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1 h-9 text-sm"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
            Delete{assigned.length > 0 ? ` (${assigned.length})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── AddShiftDialog (create one-off or recurring shifts) ──────────────────────

function AddShiftDialog({
  open,
  initialDate,
  onClose,
  onRefresh,
}: {
  open: boolean
  initialDate: string
  onClose: () => void
  onRefresh: () => void
}) {
  const [isPending, startTransition] = useTransition()
  
  // Form state
  const [slot, setSlot] = useState("AM")
  const [startTime, setStartTime] = useState(SLOT_DEFAULTS.AM.start)
  const [endTime, setEndTime] = useState(SLOT_DEFAULTS.AM.end)
  const [capacity, setCapacity] = useState("2")
  const [startDate, setStartDate] = useState(initialDate)
  const [endDate, setEndDate] = useState("")
  const [recurrence, setRecurrence] = useState("none")
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5])
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStartDate(initialDate)
      setEndDate("")
      setRecurrence("none")
      setSlot("AM")
      setStartTime(SLOT_DEFAULTS.AM.start)
      setEndTime(SLOT_DEFAULTS.AM.end)
      setCapacity("2")
      setCustomDays([1, 2, 3, 4, 5])
    }
  }, [open, initialDate])

  const handleSlotChange = (s: string) => {
    setSlot(s)
    setStartTime(SLOT_DEFAULTS[s]?.start ?? "09:00")
    setEndTime(SLOT_DEFAULTS[s]?.end ?? "12:00")
  }

  const toggleDay = (d: number) => {
    setCustomDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))
  }

  // Preview dates
  const previewDates = useMemo(() => {
    if (recurrence === "none") {
      return startDate ? [startDate] : []
    }
    const baseDay = startDate ? new Date(startDate + "T00:00:00").getDay() : undefined
    return computeRecurrenceDates(recurrence, startDate, endDate || startDate, customDays, baseDay)
  }, [recurrence, startDate, endDate, customDays])

  const handleCreate = () => {
    if (!startDate) {
      toast.error("Please select a start date")
      return
    }
    if (recurrence !== "none" && !endDate) {
      toast.error("Please select an end date for recurring shifts")
      return
    }
    if (recurrence === "custom" && customDays.length === 0) {
      toast.error("Please select at least one day of the week")
      return
    }

    startTransition(async () => {
      if (recurrence === "none") {
        // Single shift
        const res = await createSingleShift({
          shift_date: startDate,
          slot,
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
      } else {
        // Recurring shifts - use bulk create
        const baseDay = new Date(startDate + "T00:00:00").getDay()
        let daysOfWeek: number[] = []

        switch (recurrence) {
          case "daily":
            daysOfWeek = [0, 1, 2, 3, 4, 5, 6]
            break
          case "weekdays":
            daysOfWeek = [1, 2, 3, 4, 5]
            break
          case "weekends":
            daysOfWeek = [0, 6]
            break
          case "weekly":
          case "biweekly":
            daysOfWeek = [baseDay]
            break
          case "monthly":
            // Monthly is handled differently - we'll compute dates manually
            daysOfWeek = [0, 1, 2, 3, 4, 5, 6] // All days, but we filter by date
            break
          case "custom":
            daysOfWeek = customDays
            break
        }

        // For monthly recurrence, create shifts one by one on specific dates
        if (recurrence === "monthly") {
          const dates = previewDates
          let created = 0
          let skipped = 0
          for (const dateStr of dates) {
            const res = await createSingleShift({
              shift_date: dateStr,
              slot,
              start_time: startTime,
              end_time: endTime,
              capacity: parseInt(capacity) || 2,
            })
            if (res.success) created++
            else skipped++
          }
          toast.success(`Created ${created} shifts${skipped > 0 ? `, ${skipped} skipped` : ""}`)
          onRefresh()
          onClose()
          return
        }

        // Bi-weekly also needs special handling
        if (recurrence === "biweekly") {
          const dates = previewDates
          let created = 0
          let skipped = 0
          for (const dateStr of dates) {
            const res = await createSingleShift({
              shift_date: dateStr,
              slot,
              start_time: startTime,
              end_time: endTime,
              capacity: parseInt(capacity) || 2,
            })
            if (res.success) created++
            else skipped++
          }
          toast.success(`Created ${created} shifts${skipped > 0 ? `, ${skipped} skipped` : ""}`)
          onRefresh()
          onClose()
          return
        }

        // Use bulk create for other patterns
        const res = await bulkCreateShifts({
          slot,
          startTime,
          endTime,
          capacity: parseInt(capacity) || 2,
          startDate,
          endDate: endDate || startDate,
          daysOfWeek,
        })
        if (res.success) {
          toast.success(`Created ${res.created} shifts${res.skipped ? `, ${res.skipped} already existed` : ""}`)
          onRefresh()
          onClose()
        } else {
          toast.error(res.error || "Failed to create shifts")
        }
      }
    })
  }

  const needsEndDate = recurrence !== "none"

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Shift
          </DialogTitle>
          <DialogDescription className="text-xs">
            Create a single shift or set up a recurring schedule
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-4">
            {/* Recurrence Pattern — compact pill chips */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Schedule Type</Label>
              <div className="flex flex-wrap gap-1.5">
                {RECURRENCE_PATTERNS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setRecurrence(p.value)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      recurrence === p.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/60"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {recurrence !== "none" && (
                <p className="text-xs text-muted-foreground">
                  {RECURRENCE_PATTERNS.find((p) => p.value === recurrence)?.desc}
                </p>
              )}
            </div>

            {/* Date Selection */}
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{needsEndDate ? "Start Date" : "Date"}</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              {needsEndDate && (
                <div className="space-y-1.5">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Custom Days Selection */}
            {recurrence === "custom" && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Days of Week</Label>
                <div className="flex gap-1.5">
                  {WEEKDAYS_SHORT.map((day, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={`w-8 h-8 rounded-full text-xs font-medium border transition-all ${
                        customDays.includes(i)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/60"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time Slot */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time Slot</Label>
              <div className="flex gap-2">
                {SLOTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSlotChange(s)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-center transition-all ${
                      slot === s
                        ? "border-primary bg-primary/8 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="text-sm font-medium">{SLOT_DEFAULTS[s].label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {fmt12(SLOT_DEFAULTS[s].start)}–{fmt12(SLOT_DEFAULTS[s].end)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Time + Capacity in one row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Capacity */}
            <div className="space-y-1.5">
              <Label className="text-xs">Capacity</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-20 h-9 text-sm"
                />
                <span className="text-xs text-muted-foreground">max volunteers per shift</span>
              </div>
            </div>

            {/* Preview */}
            {previewDates.length > 0 && (
              <div className="space-y-3 p-4 rounded-xl bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Preview</span>
                  <Badge variant="secondary" className="text-base">
                    {previewDates.length} shift{previewDates.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                {previewDates.length <= 10 ? (
                  <div className="flex flex-wrap gap-2">
                    {previewDates.map((d) => (
                      <span
                        key={d}
                        className="px-2 py-1 bg-background rounded text-sm border"
                      >
                        {new Date(d + "T00:00:00").toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {new Date(previewDates[0] + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })} – {new Date(previewDates[previewDates.length - 1] + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-3 border-t shrink-0 flex gap-2 bg-background">
          <Button variant="outline" onClick={onClose} className="flex-1 h-9 text-sm">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isPending} className="flex-1 h-9 text-sm">
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Plus className="h-3.5 w-3.5 mr-1.5" />
            )}
            {recurrence === "none" ? "Create Shift" : `Create ${previewDates.length} Shift${previewDates.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── CalendarTab (monthly view like volunteer) ────────────────────────────────

function CalendarTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [addDialogDate, setAddDialogDate] = useState<string | null>(null)

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
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleDayClick = (_date: Date) => {
    // Day clicks do not open the add dialog — use the Add Shift button instead
  }

  const handleShiftClick = (shift: Shift | null, _slot: string, _dateStr: string) => {
    if (shift) {
      setSelectedShift(shift)
    }
  }

  const handleRefresh = async () => {
    await loadMonthData()
    // Update selected shift if still selected
    if (selectedShift) {
      const updatedShift = shifts.find((s) => s.id === selectedShift.id)
      if (updatedShift) {
        setSelectedShift(updatedShift)
      }
    }
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        {/* Month navigation + Add button — all in one card */}
        <Card>
          <CardContent className="flex items-center justify-between p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-muted-foreground hidden sm:block" />
              <span className="text-base sm:text-lg font-semibold">{monthName}</span>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <Button
              onClick={() => setAddDialogDate(ymd(new Date()))}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Shift
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
            <CardContent className="flex items-center justify-center py-16">
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

      {/* Edit shift sheet */}
      <EditShiftSheet
        open={!!selectedShift}
        shift={selectedShift}
        volunteers={volunteers}
        onClose={() => setSelectedShift(null)}
        onRefresh={handleRefresh}
      />

      {/* Add shift dialog */}
      <AddShiftDialog
        open={!!addDialogDate}
        initialDate={addDialogDate || ""}
        onClose={() => setAddDialogDate(null)}
        onRefresh={handleRefresh}
      />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminShiftsPage() {
  return (
    <RequireAuth>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Shift Management</h1>
          <p className="text-muted-foreground">Create shifts, assign volunteers, and manage your schedule</p>
        </div>

        {/* Calendar view */}
        <CalendarTab />
      </div>
    </RequireAuth>
  )
}
