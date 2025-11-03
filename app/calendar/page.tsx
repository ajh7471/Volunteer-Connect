"use client"

import RequireAuth from "@/app/components/RequireAuth"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { addMonths, daysInGrid, endOfMonth, isSameMonth, startOfMonth, ymd } from "@/lib/date"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useToast } from "@/app/components/Toast"

type Shift = {
  id: string
  shift_date: string
  slot: "AM" | "MID" | "PM"
  start_time: string
  end_time: string
  capacity: number
}
type Assignment = { id: string; shift_id: string; user_id: string }

export default function CalendarPage() {
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()))
  const [userId, setUserId] = useState<string | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const { push } = useToast()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setErr(null)
      const min = ymd(startOfMonth(month))
      const max = ymd(endOfMonth(month))
      const [{ data: sData, error: sErr }, { data: aData, error: aErr }] = await Promise.all([
        supabase
          .from("shifts")
          .select("*")
          .gte("shift_date", min)
          .lte("shift_date", max)
          .order("shift_date", { ascending: true }),
        supabase
          .from("shift_assignments")
          .select("*")
          .gte("created_at", `${min} 00:00:00`)
          .lte("created_at", `${max} 23:59:59`),
      ])
      if (!mounted) return
      if (sErr) setErr(sErr.message)
      if (aErr) setErr(aErr.message)
      setShifts((sData as Shift[]) ?? [])
      setAssignments((aData as Assignment[]) ?? [])
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [month])

  const byDateSlot = useMemo(() => {
    const m = new Map<string, Shift>()
    for (const s of shifts) m.set(`${s.shift_date}_${s.slot}`, s)
    return m
  }, [shifts])

  const assignmentsByShift = useMemo(() => {
    const m = new Map<string, Assignment[]>()
    for (const a of assignments) {
      const arr = m.get(a.shift_id) || []
      arr.push(a)
      m.set(a.shift_id, arr)
    }
    return m
  }, [assignments])

  useEffect(() => {
    async function loadCounts() {
      if (shifts.length === 0) {
        setCounts({})
        return
      }
      const ids = shifts.map((s) => s.id)
      const { data, error } = await supabase.rpc("shift_counts", { ids })
      if (error) return // silently ignore; capacity still enforced
      const map: Record<string, number> = {}
      ;(data as { shift_id: string; qty: number }[]).forEach((row) => {
        map[row.shift_id] = row.qty
      })
      setCounts(map)
    }
    loadCounts()
  }, [shifts])

  async function refreshAssignments() {
    const min = ymd(startOfMonth(month))
    const max = ymd(endOfMonth(month))
    const { data, error } = await supabase
      .from("shift_assignments")
      .select("*")
      .gte("created_at", `${min} 00:00:00`)
      .lte("created_at", `${max} 23:59:59`)
    if (error) setErr(error.message)
    setAssignments((data as Assignment[]) ?? [])
  }

  async function join(shift: Shift) {
    if (pending) return
    if (!userId) {
      push({ type: "error", msg: "Please login." })
      return setErr("Please login.")
    }
    setPending(shift.id)
    setErr(null)
    const { error } = await supabase.from("shift_assignments").insert({ shift_id: shift.id, user_id: userId })
    if (error) {
      setErr(error.message)
      push({ type: "error", msg: error.message })
    } else {
      await refreshAssignments()
      push({ type: "success", msg: "Added to shift" })
    }
    setPending(null)
  }

  async function leave(shift: Shift) {
    if (pending) return
    if (!userId) return
    setPending(shift.id)
    setErr(null)
    const { error } = await supabase.from("shift_assignments").delete().match({ shift_id: shift.id, user_id: userId })
    if (error) {
      setErr(error.message)
      push({ type: "error", msg: error.message })
    } else {
      await refreshAssignments()
      push({ type: "success", msg: "Removed from shift" })
    }
    setPending(null)
  }

  function Cell({ date }: { date: Date }) {
    const inMonth = isSameMonth(date, month)
    const dYMD = ymd(date)
    const slots: Array<Shift["slot"]> = ["AM", "MID", "PM"]
    return (
      <div
        className={`min-h-36 sm:min-h-32 rounded-lg border p-2 sm:p-3 ${inMonth ? "bg-card" : "bg-muted/50 text-muted-foreground"} flex flex-col`}
      >
        <div className="mb-1 text-xs sm:text-sm font-medium">{date.getDate()}</div>
        <div className="mt-auto space-y-1">
          {slots.map((slot) => {
            const s = byDateSlot.get(`${dYMD}_${slot}`)
            if (!s)
              return (
                <div key={slot} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  No {slot}
                </div>
              )
            const list = assignmentsByShift.get(s.id) || []
            const mine = !!list.find((a) => a.user_id === userId)
            const full = (counts[s.id] ?? 0) >= s.capacity
            return (
              <button
                key={slot}
                onClick={() => (mine ? leave(s) : join(s))}
                disabled={pending === s.id || (!mine && full)}
                className={[
                  "w-full rounded-md px-2 py-1.5 sm:py-1 text-left text-xs transition min-h-[44px] sm:min-h-0",
                  pending === s.id
                    ? "opacity-60 cursor-wait"
                    : mine
                      ? "bg-green-100 ring-2 ring-green-400 hover:bg-green-200"
                      : full
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-blue-100 hover:bg-blue-200",
                ].join(" ")}
                title={mine ? "Click to leave this shift" : full ? "Shift is full" : "Click to join this shift"}
              >
                <span className="font-medium">{slot}</span>
                <span className="ml-2">
                  {counts[s.id] ?? 0}/{s.capacity}
                </span>
                {mine && <span className="ml-2 text-green-700 dark:text-green-400">You</span>}
              </button>
            )
          })}
          <Link
            href={`/day/${dYMD}`}
            className="mt-2 block text-center text-xs text-blue-600 hover:text-blue-800 underline py-1"
          >
            View roster
          </Link>
        </div>
      </div>
    )
  }

  const gridDays = useMemo(() => daysInGrid(month), [month])

  return (
    <RequireAuth>
      <main className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Volunteer Calendar</h1>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-base sm:text-lg font-semibold">
            {month.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(addMonths(month, -1))}
              className="flex-1 sm:flex-none"
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(startOfMonth(new Date()))}
              className="flex-1 sm:flex-none"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(addMonths(month, 1))}
              className="flex-1 sm:flex-none"
            >
              Next
            </Button>
          </div>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground hidden sm:block">
              {d}
            </div>
          ))}
          {loading ? (
            <div className="col-span-2 sm:col-span-7 rounded-lg border bg-card p-6 text-center">Loading…</div>
          ) : (
            gridDays.map((d, i) => <Cell key={i} date={d} />)
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">Green = your shift; Blue = available; Gray = full.</p>
      </main>
    </RequireAuth>
  )
}
