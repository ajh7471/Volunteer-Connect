"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import RequireAuth from "@/app/components/RequireAuth"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import {
  ChevronLeft, ChevronRight, Plus, Trash2, X, UserPlus,
  Loader2, AlertCircle, CheckCircle2, Users, CalendarDays, Clock,
} from "lucide-react"
import {
  getShiftsForRange, createSingleShift, deleteSingleShift, updateSingleShift,
  bulkCreateShifts, bulkDeleteShifts, bulkUpdateCapacity,
  assignShiftToUser, revokeShiftFromUser, getActiveVolunteers,
} from "@/app/admin/actions"
import { toast } from "@/lib/toast"

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

type DayShifts = { [slot: string]: Shift | null }
type WeekData = { date: Date; dateStr: string; shifts: DayShifts }[]

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOTS = ["AM", "MID", "PM"]
const SLOT_DEFAULTS: Record<string, { start: string; end: string; label: string }> = {
  AM:  { start: "08:00", end: "12:00", label: "Morning" },
  MID: { start: "12:00", end: "16:00", label: "Midday" },
  PM:  { start: "16:00", end: "20:00", label: "Evening" },
}
const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const DOW_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt12(time: string) {
  if (!time) return ""
  const [h, m] = time.split(":").map(Number)
  const ampm = h < 12 ? "AM" : "PM"
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`
}

function addDays(d: Date, n: number) {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0]
}

function startOfWeek(d: Date) {
  const copy = new Date(d)
  copy.setDate(copy.getDate() - copy.getDay())
  return copy
}

function buildWeek(base: Date): WeekData {
  const sun = startOfWeek(base)
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(sun, i)
    return { date, dateStr: toDateStr(date), shifts: { AM: null, MID: null, PM: null } }
  })
}

function fillWeek(weekData: WeekData, shifts: Shift[]): WeekData {
  const map: Record<string, Shift[]> = {}
  for (const s of shifts) {
    if (!map[s.shift_date]) map[s.shift_date] = []
    map[s.shift_date].push(s)
  }
  return weekData.map((day) => {
    const dayShifts = map[day.dateStr] || []
    const slotMap: DayShifts = { AM: null, MID: null, PM: null }
    for (const slot of SLOTS) {
      slotMap[slot] = dayShifts.find((s) => s.slot === slot) ?? null
    }
    return { ...day, shifts: slotMap }
  })
}

// ─── FillBadge ────────────────────────────────────────────────────────────────

function FillBadge({ assigned, capacity, size = "sm" }: { assigned: number; capacity: number; size?: "sm" | "lg" }) {
  const full = assigned >= capacity
  const close = !full && assigned >= capacity * 0.75
  const cls = size === "lg" ? "text-sm font-bold px-2.5 py-1" : "text-[11px] font-bold px-2 py-0.5"
  return (
    <span className={[
      cls, "rounded-full tabular-nums",
      full  ? "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300"
           : close ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
           : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
    ].join(" ")}>
      {assigned}/{capacity}
    </span>
  )
}

// ─── ShiftCard ────────────────────────────────────────────────────────────────

function ShiftCard({
  slot, shift, dateStr, onSelect,
}: {
  slot: string; shift: Shift | null; dateStr: string
  onSelect: (shift: Shift | null, slot: string, dateStr: string) => void
}) {
  const defaults = SLOT_DEFAULTS[slot]
  const hasShift = !!shift
  const assigned = shift?.shift_assignments.length ?? 0
  const capacity = shift?.capacity ?? 0

  return (
    <button
      onClick={() => onSelect(shift, slot, dateStr)}
      className={[
        "w-full text-left rounded-xl border-2 transition-all duration-150 group",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        hasShift
          ? "bg-card border-border hover:border-primary/50 hover:shadow-md p-3"
          : "border-dashed border-border/50 hover:border-primary/40 hover:bg-muted/50 p-3",
      ].join(" ")}
    >
      {hasShift ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {defaults.label}
            </span>
            <FillBadge assigned={assigned} capacity={capacity} />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {fmt12(shift.start_time)} – {fmt12(shift.end_time)}
          </div>
          {assigned > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {assigned} volunteer{assigned !== 1 ? "s" : ""} assigned
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-2 text-muted-foreground/60 group-hover:text-primary/70 transition-colors">
          <Plus className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium">{defaults.label}</span>
        </div>
      )}
    </button>
  )
}

// ─── ShiftSheet (replaces SidePanel) ──────────────────────────────────────────

function ShiftSheet({
  open, shift, slot, dateStr, volunteers, onClose, onRefresh,
}: {
  open: boolean; shift: Shift | null; slot: string; dateStr: string
  volunteers: Volunteer[]; onClose: () => void; onRefresh: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [assigningId, setAssigningId] = useState("")
  const [editingCapacity, setEditingCapacity] = useState(false)
  const [newCapacity, setNewCapacity] = useState(shift?.capacity?.toString() ?? "3")
  const [startTime, setStartTime] = useState(shift?.start_time ?? SLOT_DEFAULTS[slot]?.start ?? "08:00")
  const [endTime, setEndTime] = useState(shift?.end_time ?? SLOT_DEFAULTS[slot]?.end ?? "12:00")
  const [capacity, setCapacity] = useState(shift?.capacity?.toString() ?? "3")

  // Reset state when shift changes
  useEffect(() => {
    setNewCapacity(shift?.capacity?.toString() ?? "3")
    setStartTime(shift?.start_time ?? SLOT_DEFAULTS[slot]?.start ?? "08:00")
    setEndTime(shift?.end_time ?? SLOT_DEFAULTS[slot]?.end ?? "12:00")
    setCapacity(shift?.capacity?.toString() ?? "3")
    setEditingCapacity(false)
    setAssigningId("")
  }, [shift, slot])

  const assigned = shift?.shift_assignments ?? []
  const unassigned = volunteers.filter((v) => !assigned.some((a) => a.user_id === v.id))

  const displayDate = new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })

  const handleCreate = () => {
    startTransition(async () => {
      const res = await createSingleShift({
        shift_date: dateStr, slot,
        start_time: startTime, end_time: endTime,
        capacity: parseInt(capacity) || 3,
      })
      if (res.success) { toast.success("Shift created"); onRefresh(); onClose() }
      else toast.error(res.error || "Failed to create shift")
    })
  }

  const handleDelete = () => {
    if (!shift) return
    startTransition(async () => {
      const res = await deleteSingleShift(shift.id)
      if (res.success) { toast.success("Shift deleted"); onRefresh(); onClose() }
      else toast.error(res.error || "Failed to delete")
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
      if (res.success) { toast.success("Capacity updated"); setEditingCapacity(false); onRefresh() }
      else toast.error(res.error || "Failed")
    })
  }

  const handleAssign = () => {
    if (!shift || !assigningId) return
    startTransition(async () => {
      const res = await assignShiftToUser(assigningId, shift.id)
      if (res.success) { toast.success("Volunteer assigned"); setAssigningId(""); onRefresh() }
      else toast.error(res.error || "Failed")
    })
  }

  const handleRemove = (assignmentId: string, name: string) => {
    startTransition(async () => {
      const res = await revokeShiftFromUser(assignmentId)
      if (res.success) { toast.success(`${name} removed`); onRefresh() }
      else toast.error(res.error || "Failed")
    })
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left pb-4 border-b">
          <SheetTitle className="text-lg">{SLOT_DEFAULTS[slot]?.label} Shift</SheetTitle>
          <SheetDescription>{displayDate}</SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Create new shift */}
          {!shift && (
            <div className="space-y-4">
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
                <Input type="number" min={1} max={50} value={capacity}
                  onChange={(e) => setCapacity(e.target.value)} className="mt-1.5 w-24" />
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
                    {Math.round((parseInt(shift.end_time) - parseInt(shift.start_time))} hours
                  </p>
                </div>
              </div>

              {/* Capacity */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold">Capacity</Label>
                  {!editingCapacity && (
                    <button onClick={() => { setNewCapacity(shift.capacity.toString()); setEditingCapacity(true) }}
                      className="text-sm text-primary hover:underline">Edit</button>
                  )}
                </div>
                {editingCapacity ? (
                  <div className="flex items-center gap-2">
                    <Input type="number" min={1} max={50} value={newCapacity}
                      onChange={(e) => setNewCapacity(e.target.value)} className="w-24" />
                    <Button size="sm" onClick={handleUpdateCapacity} disabled={isPending}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingCapacity(false)}>Cancel</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <FillBadge assigned={assigned.length} capacity={shift.capacity} size="lg" />
                    <span className="text-sm text-muted-foreground">{assigned.length} of {shift.capacity} spots filled</span>
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

// ─── BulkOpsTab ───────────────────────────────────────────────────────────────

function BulkOpsTab({ onRefresh }: { onRefresh: () => void }) {
  const [isPending, startTransition] = useTransition()

  // Create form
  const [cSlot, setCSlot] = useState("AM")
  const [cStart, setCStart] = useState("08:00")
  const [cEnd, setCEnd] = useState("12:00")
  const [cCapacity, setCCapacity] = useState("3")
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
  const [uCapacity, setUCapacity] = useState("3")
  const [uResult, setUResult] = useState<string | null>(null)

  const computePreview = () => {
    if (!cDateStart || !cDateEnd || cDays.length === 0) { setCPreview(0); return }
    let count = 0
    const cur = new Date(cDateStart + "T00:00:00")
    const end = new Date(cDateEnd + "T00:00:00")
    while (cur <= end) { if (cDays.includes(cur.getDay())) count++; cur.setDate(cur.getDate() + 1) }
    setCPreview(count)
  }

  const toggleDay = (d: number) =>
    setCDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort())

  const handleSlotChange = (s: string) => {
    setCSlot(s)
    setCStart(SLOT_DEFAULTS[s]?.start ?? "08:00")
    setCEnd(SLOT_DEFAULTS[s]?.end ?? "12:00")
  }

  const handleCreate = () => {
    if (!cDateStart || !cDateEnd) { toast.error("Select a date range"); return }
    if (cDays.length === 0) { toast.error("Select at least one day of week"); return }
    startTransition(async () => {
      setCResult(null)
      const res = await bulkCreateShifts({
        slot: cSlot, startTime: cStart, endTime: cEnd,
        capacity: parseInt(cCapacity) || 3,
        startDate: cDateStart, endDate: cDateEnd, daysOfWeek: cDays,
      })
      if (res.success) { setCResult(`Created ${res.created} shifts, skipped ${res.skipped} existing`); onRefresh() }
      else toast.error(res.error || "Failed")
    })
  }

  const handleDelete = () => {
    if (!dDateStart || !dDateEnd) { toast.error("Select a date range"); return }
    startTransition(async () => {
      setDResult(null)
      const res = await bulkDeleteShifts({
        startDate: dDateStart, endDate: dDateEnd,
        slot: dSlot === "all" ? undefined : dSlot, onlyEmpty: dOnlyEmpty,
      })
      if (res.success) { setDResult(`Deleted ${res.deleted} shifts, skipped ${res.skipped}`); onRefresh() }
      else toast.error(res.error || "Failed")
    })
  }

  const handleCapacity = () => {
    if (!uDateStart || !uDateEnd) { toast.error("Select a date range"); return }
    startTransition(async () => {
      setUResult(null)
      const res = await bulkUpdateCapacity({
        startDate: uDateStart, endDate: uDateEnd,
        slot: uSlot === "all" ? undefined : uSlot,
        capacity: parseInt(uCapacity) || 3,
      })
      if (res.success) { setUResult(`Updated ${res.updated} shifts`); onRefresh() }
      else toast.error(res.error || "Failed")
    })
  }

  const ResultBanner = ({ msg }: { msg: string }) => (
    <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
      <CheckCircle2 className="h-4 w-4 shrink-0" />{msg}
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
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SLOTS.map((s) => <SelectItem key={s} value={s}>{SLOT_DEFAULTS[s].label} ({s})</SelectItem>)}
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
              <Input type="number" min={1} max={50} value={cCapacity}
                onChange={(e) => setCCapacity(e.target.value)} className="mt-1.5 w-24" />
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
                  <button key={i} onClick={() => toggleDay(i)}
                    className={[
                      "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                      cDays.includes(i)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/60",
                    ].join(" ")}>
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
              <Button variant="outline" onClick={computePreview} className="flex-1">Preview</Button>
              <Button onClick={handleCreate} disabled={isPending} className="flex-1">
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create
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
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Slots</SelectItem>
                  {SLOTS.map((s) => <SelectItem key={s} value={s}>{SLOT_DEFAULTS[s].label} ({s})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-start gap-3 cursor-pointer py-1">
              <input type="checkbox" checked={dOnlyEmpty} onChange={(e) => setDOnlyEmpty(e.target.checked)}
                className="rounded mt-0.5" />
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
              <Trash2 className="h-4 w-4 mr-2" />Delete Shifts
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
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Slots</SelectItem>
                  {SLOTS.map((s) => <SelectItem key={s} value={s}>{SLOT_DEFAULTS[s].label} ({s})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>New Capacity</Label>
              <Input type="number" min={1} max={50} value={uCapacity}
                onChange={(e) => setUCapacity(e.target.value)} className="mt-1.5 w-24" />
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

// ─── WeekGridTab ──────────────────────────────────────────────────────────────

function WeekGridTab() {
  const [weekBase, setWeekBase] = useState(() => startOfWeek(new Date()))
  const [weekData, setWeekData] = useState<WeekData>([])
  const [loading, setLoading] = useState(true)
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [selected, setSelected] = useState<{ shift: Shift | null; slot: string; dateStr: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const blank = buildWeek(weekBase)
    const startDate = toDateStr(blank[0].date)
    const endDate = toDateStr(blank[6].date)

    const [shiftsRes, volsRes] = await Promise.all([
      getShiftsForRange(startDate, endDate),
      getActiveVolunteers(),
    ])

    if (shiftsRes.success) {
      setWeekData(fillWeek(blank, (shiftsRes.shifts as unknown as Shift[]) || []))
    } else {
      setWeekData(blank)
    }
    if (volsRes.success) setVolunteers((volsRes.volunteers as Volunteer[]) || [])
    setLoading(false)
  }, [weekBase])

  useEffect(() => { load() }, [load])

  const prevWeek = () => setWeekBase((d) => addDays(d, -7))
  const nextWeek = () => setWeekBase((d) => addDays(d, 7))
  const goToday = () => { setWeekBase(startOfWeek(new Date())); setSelected(null) }

  const handleSelect = (shift: Shift | null, slot: string, dateStr: string) => {
    setSelected({ shift, slot, dateStr })
  }

  const weekLabel = weekData.length === 7
    ? `${weekData[0].date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekData[6].date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : ""

  const today = toDateStr(new Date())

  // Refresh selected shift data after changes
  const handleRefresh = async () => {
    await load()
    // Update selected shift if still selected
    if (selected) {
      const newWeek = buildWeek(weekBase)
      const startDate = toDateStr(newWeek[0].date)
      const endDate = toDateStr(newWeek[6].date)
      const res = await getShiftsForRange(startDate, endDate)
      if (res.success) {
        const filled = fillWeek(newWeek, (res.shifts as unknown as Shift[]) || [])
        const day = filled.find((d) => d.dateStr === selected.dateStr)
        if (day) {
          setSelected({ ...selected, shift: day.shifts[selected.slot] })
        }
      }
    }
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Week nav bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={prevWeek} className="h-9 w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold min-w-[260px] text-center">{weekLabel}</h2>
            <Button variant="outline" size="icon" onClick={nextWeek} className="h-9 w-9">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={goToday} className="ml-2">Today</Button>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
          </div>
          <div className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" />Open</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500" />Near full</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" />Full</span>
          </div>
        </div>

        {/* Week grid */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-7 gap-4">
            {/* Day columns */}
            {weekData.map((day) => {
              const isToday = day.dateStr === today
              const isPast = day.dateStr < today
              return (
                <div key={day.dateStr} className={["space-y-3", isPast ? "opacity-60" : ""].join(" ")}>
                  {/* Day header */}
                  <div className="text-center pb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {DOW_LABELS[day.date.getDay()]}
                    </p>
                    <span className={[
                      "inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold mt-1",
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                    ].join(" ")}>
                      {day.date.getDate()}
                    </span>
                  </div>

                  {/* Shift cards */}
                  {SLOTS.map((slot) => (
                    <ShiftCard
                      key={slot}
                      slot={slot}
                      shift={day.shifts[slot]}
                      dateStr={day.dateStr}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )
            })}
          </div>

          {!loading && weekData.length > 0 && weekData.every((d) => SLOTS.every((s) => !d.shifts[s])) && (
            <div className="mt-8 text-center">
              <p className="text-muted-foreground mb-3">No shifts this week.</p>
              <Button variant="outline" onClick={() => {
                document.querySelector<HTMLButtonElement>('[data-value="bulk"]')?.click()
              }}>
                Create Recurring Shifts
              </Button>
            </div>
          )}
        </div>
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
      />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminShiftsPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <RequireAuth>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Page header */}
        <div className="border-b bg-card px-6 py-5 shrink-0">
          <h1 className="text-2xl font-bold text-foreground">Shift Management</h1>
          <p className="text-muted-foreground mt-1">
            Create shifts, assign volunteers, and manage your schedule
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="week" className="flex-1 flex flex-col min-h-0">
          <div className="border-b bg-card px-6 shrink-0">
            <TabsList className="h-12 bg-transparent p-0 gap-6">
              {[
                { value: "week", label: "Week View", icon: CalendarDays },
                { value: "bulk", label: "Bulk Operations", icon: Users },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  data-value={value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 pt-3 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="week" className="flex-1 min-h-0 mt-0 overflow-hidden">
            <WeekGridTab key={refreshKey} />
          </TabsContent>

          <TabsContent value="bulk" className="flex-1 min-h-0 mt-0 overflow-auto">
            <BulkOpsTab onRefresh={() => setRefreshKey((k) => k + 1)} />
          </TabsContent>
        </Tabs>
      </div>
    </RequireAuth>
  )
}
