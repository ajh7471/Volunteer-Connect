"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { ymd } from "@/lib/date"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import RequireAuth from "@/app/components/RequireAuth"

type Shift = { id: string; shift_date: string; slot: "AM" | "MID" | "PM"; start_time: string; end_time: string }
type Assignment = { id: string; shift_id: string; user_id: string; created_at: string }

export default function MySchedule() {
  const [userId, setUserId] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [shifts, setShifts] = useState<Record<string, Shift>>({})
  const [err, setErr] = useState<string | null>(null)
  const today = ymd(new Date())

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      setUserId(data.user?.id ?? null)
    })()
  }, [])

  useEffect(() => {
    if (!userId) return
    loadMine()
  }, [userId])

  async function loadMine() {
    setErr(null)
    // Get my future assignments (RLS ensures only mine are returned)
    const { data: aData, error: aErr } = await supabase
      .from("shift_assignments")
      .select("*")
      .gte("created_at", `${today} 00:00:00`)
      .order("created_at", { ascending: true })
    if (aErr) {
      setErr(aErr.message)
      return
    }
    const mine = (aData as Assignment[]) || []
    // Fetch shifts for those assignments
    const shiftIds = Array.from(new Set(mine.map((a) => a.shift_id)))
    if (shiftIds.length) {
      const { data: sData, error: sErr } = await supabase
        .from("shifts")
        .select("id, shift_date, slot, start_time, end_time")
        .in("id", shiftIds)
      if (sErr) {
        setErr(sErr.message)
        return
      }
      const map: Record<string, Shift> = {}
      ;((sData as Shift[]) || []).forEach((s) => (map[s.id] = s))
      setShifts(map)
    } else {
      setShifts({})
    }
    setAssignments(mine)
  }

  const items = useMemo(() => {
    const withShift = assignments
      .map((a) => ({ a, s: shifts[a.shift_id] }))
      .filter((x) => x.s)
      .sort((x, y) => x.s.shift_date.localeCompare(y.s.shift_date) || x.s.slot.localeCompare(y.s.slot))
    return withShift
  }, [assignments, shifts])

  return (
    <RequireAuth>
      <main className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">My Schedule</h1>

        {err && (
          <Alert variant="destructive">
            <AlertDescription>{err}</AlertDescription>
          </Alert>
        )}

        {userId === null && <p className="text-sm text-muted-foreground">Checking session…</p>}

        {userId && (
          <div className="space-y-2">
            {items.length === 0 && <p className="text-sm text-muted-foreground">No upcoming shifts yet.</p>}
            {items.map(({ a, s }) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="text-sm">
                  <div className="font-medium text-card-foreground">
                    {s.shift_date} — {s.slot}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {s.start_time}–{s.end_time}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    const { error } = await supabase
                      .from("shift_assignments")
                      .delete()
                      .match({ shift_id: s.id, user_id: userId })
                    if (!error) loadMine()
                  }}
                >
                  Leave shift
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </RequireAuth>
  )
}
