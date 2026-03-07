"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import RequireAuth from "@/app/components/RequireAuth"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChevronLeft, ChevronRight, Plus, Trash2, X, UserPlus,
  Loader2, AlertCircle, CheckCircle2, Users, CalendarDays,
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
const SLOT_DEFAULTS: Record<string, { start: string; end: string }> = {
  AM:  { start: "08:00", end: "12:00" },
  MID: { start: "12:00", end: "16:00" },
  PM:  { start: "16:00", end: "20:00" },
}
const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const SLOT_COLORS: Record<string, string> = {
  AM:  "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  MID: "bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800",
  PM:  "bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800",
}
const SLOT_BADGE: Record<string, string> = {
  AM:  "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  MID: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200",
  PM:  "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200",
}

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
  const mon = startOfWeek(base)
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(mon, i)
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

function FillBadge({ assigned, capacity }: { assigned: number; capacity: number }) {
  const full = assigned >= capacity
  const close = !full && assigned >= capacity * 0.75
  return (
    <span className={[
      "text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums",
      full  ? "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300"
           : close ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
           : "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300",
    ].join(" ")}>
      {assigned}/{capacity}
    </span>
  )
}

// ─── ShiftCell ────────────────────────────────────────────────────────────────

function ShiftCell({
  slot, shift, dateStr, selected, onSelect,
}: {
  slot: string; shift: Shift | null; dateStr: string
  selected: boolean; onSelect: (shift: Shift | null, slot: string, dateStr: string) => void
}) {
  return (
    <button
      onClick={() => onSelect(shift, slot, dateStr)}
      className={[
        "w-full text-left p-2 rounded-lg border transition-all duration-100 text-xs",
        shift
          ? SLOT_COLORS[slot]
          : "border-dashed border-border/60 bg-transparent hover:border-muted-foreground/40 hover:bg-muted/30",
        selected ? "ring-2 ring-primary ring-offset-1" : "",
      ].join(" ")}
    >
      {shift ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className={["font-bold px-1.5 py-0.5 rounded text-[10px]", SLOT_BADGE[slot]].join(" ")}>{slot}</span>
            <FillBadge assigned={shift.shift_assignments.length} capacity={shift.capacity} />
          </div>
          <span className="text-muted-foreground text-[10px] leading-none">{fmt12(shift.start_time)}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-muted-foreground/40 py-0.5">
          <Plus className="h-2.5 w-2.5" />
          <span className="text-[10px]">{slot}</span>
        </div>
      )}
    </button>
  )
}

// ─── SidePanel ────────────────────────────────────────────────────────────────

function SidePanel({
  shift, slot, dateStr, volunteers, onClose, onRefresh,
}: {
  shift: Shift | null; slot: string; dateStr: string
  volunteers: Volunteer[]; onClose: () => void; onRefresh: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [assigningId, setAssigningId] = useState("")
  const [editingCapacity, setEditingCapacity] = useState(false)
  const [newCapacity, setNewCapacity] = useState(shift?.capacity?.toString() ?? "3")
  const [startTime, setStartTime] = useState(shift?.start_time ?? SLOT_DEFAULTS[slot]?.start ?? "08:00")
  const [endTime, setEndTime] = useState(shift?.end_time ?? SLOT_DEFAULTS[slot]?.end ?? "12:00")
  const [capacity, setCapacity] = useState(shift?.capacity?.toString() ?? "3")

  const assigned = shift?.shift_assignments ?? []
  const unassigned = volunteers.filter((v) => !assigned.some((a) => a.user_id === v.id))

  const displayDate = new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
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
    startTransition(async () => {
      const res = await updateSingleShift(shift.id, { capacity: parseInt(newCapacity) })
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b shrink-0">
        <div>
          <p className="text-xs text-muted-foreground">{displayDate}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={["text-xs font-bold px-2 py-0.5 rounded", SLOT_BADGE[slot]].join(" ")}>{slot}</span>
            {shift && (
              <span className="text-sm text-muted-foreground">
                {fmt12(shift.start_time)} – {fmt12(shift.end_time)}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-accent transition-colors -mt-0.5 -mr-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* ── Create new shift ── */}
        {!shift && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Create {slot} shift</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Start</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">End</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Capacity</Label>
              <Input type="number" min={1} max={50} value={capacity}
                onChange={(e) => setCapacity(e.target.value)} className="mt-1 h-8 text-sm w-20" />
            </div>
            <Button onClick={handleCreate} disabled={isPending} size="sm" className="w-full">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
              Create Shift
            </Button>
          </div>
        )}

        {/* ── Existing shift ── */}
        {shift && (
          <>
            {/* Capacity row */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capacity</span>
                {!editingCapacity && (
                  <button onClick={() => { setNewCapacity(shift.capacity.toString()); setEditingCapacity(true) }}
                    className="text-xs text-primary hover:underline">Edit</button>
                )}
              </div>
              {editingCapacity ? (
                <div className="flex items-center gap-2">
                  <Input type="number" min={1} max={50} value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)} className="w-20 h-7 text-sm" />
                  <Button size="sm" onClick={handleUpdateCapacity} disabled={isPending} className="h-7 px-3 text-xs">Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingCapacity(false)} className="h-7 px-3 text-xs">Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <FillBadge assigned={assigned.length} capacity={shift.capacity} />
                  <span className="text-sm text-muted-foreground">{assigned.length} of {shift.capacity} filled</span>
                </div>
              )}
            </div>

            {/* Assigned volunteers */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Assigned ({assigned.length})
                </span>
              </div>
              {assigned.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1">No volunteers assigned yet</p>
              ) : (
                <ul className="space-y-1.5">
                  {assigned.map((a) => (
                    <li key={a.id} className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2 group">
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-none truncate">{a.profiles?.name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.profiles?.email ?? ""}</p>
                      </div>
                      <button
                        onClick={() => handleRemove(a.id, a.profiles?.name ?? "Volunteer")}
                        disabled={isPending}
                        className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                        aria-label="Remove volunteer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Assign volunteer */}
            {assigned.length < shift.capacity && unassigned.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assign</span>
                </div>
                <div className="flex gap-2">
                  <Select value={assigningId} onValueChange={setAssigningId}>
                    <SelectTrigger className="flex-1 h-8 text-sm">
                      <SelectValue placeholder="Select volunteer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unassigned.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleAssign} disabled={!assigningId || isPending} className="h-8 shrink-0">
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
                  </Button>
                </div>
              </div>
            )}

            {assigned.length >= shift.capacity && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3 shrink-0" /> Shift is at full capacity
              </p>
            )}

            {/* Delete */}
            <div className="pt-3 border-t">
              <Button variant="destructive" size="sm" className="w-full" onClick={handleDelete} disabled={isPending}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete Shift
                {assigned.length > 0 && ` + ${assigned.length} assignment${assigned.length > 1 ? "s" : ""}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
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
    setCSlot(s); setCStart(SLOT_DEFAULTS[s]?.start ?? "08:00"); setCEnd(SLOT_DEFAULTS[s]?.end ?? "12:00")
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
    <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-2.5">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />{msg}
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">

      {/* ── Create Recurring ── */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Create Recurring Shifts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Slot</Label>
            <Select value={cSlot} onValueChange={handleSlotChange}>
              <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Start Time</Label>
              <Input type="time" value={cStart} onChange={(e) => setCStart(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End Time</Label>
              <Input type="time" value={cEnd} onChange={(e) => setCEnd(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Capacity per shift</Label>
            <Input type="number" min={1} max={50} value={cCapacity}
              onChange={(e) => setCCapacity(e.target.value)} className="mt-1 h-8 text-sm w-20" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={cDateStart} onChange={(e) => setCDateStart(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={cDateEnd} onChange={(e) => setCDateEnd(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Days of Week</Label>
            <div className="flex flex-wrap gap-1">
              {DOW_LABELS.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className={[
                    "px-2.5 py-1 rounded text-xs font-medium border transition-colors",
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
            <p className="text-xs text-muted-foreground">
              Preview: <span className="font-semibold text-foreground">{cPreview}</span> shifts to create
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={computePreview} className="flex-1 h-8 text-xs">Preview</Button>
            <Button size="sm" onClick={handleCreate} disabled={isPending} className="flex-1 h-8 text-xs">
              {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Create
            </Button>
          </div>
          {cResult && <ResultBanner msg={cResult} />}
        </CardContent>
      </Card>

      {/* ── Bulk Delete ── */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            Bulk Delete Shifts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={dDateStart} onChange={(e) => setDDateStart(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={dDateEnd} onChange={(e) => setDDateEnd(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Slot Filter</Label>
            <Select value={dSlot} onValueChange={setDSlot}>
              <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Slots</SelectItem>
                {SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={dOnlyEmpty} onChange={(e) => setDOnlyEmpty(e.target.checked)}
              className="rounded mt-0.5 shrink-0" />
            <span className="text-sm leading-tight">Only delete shifts with no assignments</span>
          </label>
          {!dOnlyEmpty && (
            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-2.5">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              All volunteer assignments on matching shifts will also be removed.
            </div>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending} className="w-full h-8 text-xs">
            {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            <Trash2 className="h-3 w-3 mr-1" />Delete Matching Shifts
          </Button>
          {dResult && <ResultBanner msg={dResult} />}
        </CardContent>
      </Card>

      {/* ── Bulk Capacity ── */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Update Capacity in Bulk
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={uDateStart} onChange={(e) => setUDateStart(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={uDateEnd} onChange={(e) => setUDateEnd(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Slot Filter</Label>
            <Select value={uSlot} onValueChange={setUSlot}>
              <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Slots</SelectItem>
                {SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">New Capacity</Label>
            <Input type="number" min={1} max={50} value={uCapacity}
              onChange={(e) => setUCapacity(e.target.value)} className="mt-1 h-8 text-sm w-20" />
          </div>
          <Button size="sm" onClick={handleCapacity} disabled={isPending} className="w-full h-8 text-xs">
            {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Apply to Matching Shifts
          </Button>
          {uResult && <ResultBanner msg={uResult} />}
        </CardContent>
      </Card>
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
    setSelected((prev) => prev?.dateStr === dateStr && prev?.slot === slot ? null : { shift, slot, dateStr })
  }

  const weekLabel = weekData.length === 7
    ? `${weekData[0].date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekData[6].date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : ""

  const today = toDateStr(new Date())

  return (
    <div className="flex h-full">
      {/* Grid area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Week nav bar */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b bg-card shrink-0">
          <Button variant="outline" size="sm" onClick={prevWeek} className="h-7 w-7 p-0">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm font-medium min-w-[220px] text-center">{weekLabel}</span>
          <Button variant="outline" size="sm" onClick={nextWeek} className="h-7 w-7 p-0">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="h-7 text-xs px-3">Today</Button>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-2" />}
          <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Open</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Near full</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Full</span>
          </div>
        </div>

        {/* 7-col grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-7 gap-2" style={{ minWidth: 600 }}>
            {/* Day headers */}
            {weekData.map((day) => {
              const isToday = day.dateStr === today
              return (
                <div key={day.dateStr} className="text-center pb-2">
                  <p className="text-[11px] text-muted-foreground">{DOW_LABELS[day.date.getDay()]}</p>
                  <span className={[
                    "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mx-auto",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                  ].join(" ")}>
                    {day.date.getDate()}
                  </span>
                </div>
              )
            })}

            {/* Slot cells per day */}
            {weekData.map((day) => (
              <div key={day.dateStr} className="flex flex-col gap-1.5">
                {SLOTS.map((slot) => (
                  <ShiftCell
                    key={slot} slot={slot} shift={day.shifts[slot]}
                    dateStr={day.dateStr}
                    selected={selected?.dateStr === day.dateStr && selected?.slot === slot}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            ))}
          </div>

          {!loading && weekData.length > 0 && weekData.every((d) => SLOTS.every((s) => !d.shifts[s])) && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              No shifts this week. Click any slot to create one, or use{" "}
              <button className="text-primary hover:underline font-medium" onClick={() => {
                // switch to bulk tab
                document.querySelector<HTMLButtonElement>('[data-value="bulk"]')?.click()
              }}>Bulk Operations</button>{" "}to create recurring shifts.
            </div>
          )}
        </div>
      </div>

      {/* Side panel */}
      {selected && (
        <div className="w-72 shrink-0 border-l bg-card flex flex-col overflow-hidden">
          <SidePanel
            key={`${selected.dateStr}-${selected.slot}`}
            shift={selected.shift} slot={selected.slot} dateStr={selected.dateStr}
            volunteers={volunteers} onClose={() => setSelected(null)} onRefresh={load}
          />
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminShiftsPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <RequireAuth>
      <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
        {/* Page header */}
        <div className="border-b bg-card px-6 py-4 shrink-0">
          <h1 className="text-lg font-bold text-foreground">Shift Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click any slot to create, edit, or assign volunteers. Use Bulk Ops for recurring schedules.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="week" className="flex-1 flex flex-col min-h-0">
          <div className="border-b bg-card px-6 shrink-0">
            <TabsList className="h-9 bg-transparent p-0 gap-5">
              {[
                { value: "week", label: "Week View" },
                { value: "bulk", label: "Bulk Operations" },
              ].map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  data-value={value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-2 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
                >
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
