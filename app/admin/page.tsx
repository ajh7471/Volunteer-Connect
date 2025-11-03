"use client"

import RequireAuth from "@/app/components/RequireAuth"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { ymd } from "@/lib/date"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/app/components/Toast"

type Profile = { id: string; name: string | null; phone: string | null }
type Shift = { id: string; shift_date: string; slot: "AM" | "MID" | "PM"; capacity: number }
type Assignment = { id: string; shift_id: string; user_id: string }

// Helper function to calculate month bounds
function monthBounds(ymdStr: string) {
  const [y, m] = ymdStr.split("-").map(Number)
  const first = new Date(y, m - 1, 1)
  const last = new Date(y, m, 0)
  const toYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  return { first: toYMD(first), last: toYMD(last) }
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [day, setDay] = useState<string>(ymd(new Date()))
  const [shifts, setShifts] = useState<Shift[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [vols, setVols] = useState<Profile[]>([])
  const [nameMap, setNameMap] = useState<Record<string, Profile>>({})
  const [err, setErr] = useState<string | null>(null)
  const [monthEmpty, setMonthEmpty] = useState<boolean | null>(null)
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)
  const [pendingAdd, setPendingAdd] = useState<string | null>(null)
  const [pendingSeed, setPendingSeed] = useState(false)
  const [loadingDay, setLoadingDay] = useState(false)
  const { push } = useToast()

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id
      if (!uid) return setIsAdmin(false)
      const { data, error } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle()
      if (error) {
        setErr(error.message)
        setIsAdmin(false)
        return
      }
      setIsAdmin(data?.role === "admin")
    })()
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    loadDay(day)
    loadVols()
    checkMonthEmpty(day)
  }, [isAdmin, day])

  async function checkMonthEmpty(dateYMD: string) {
    const { first, last } = monthBounds(dateYMD)
    const { count, error } = await supabase
      .from("shifts")
      .select("id", { count: "exact", head: true })
      .gte("shift_date", first)
      .lte("shift_date", last)
    if (error) setMonthEmpty(null)
    else setMonthEmpty(count === 0)
  }

  async function seedMonth() {
    if (pendingSeed) return
    setPendingSeed(true)
    const { first, last } = monthBounds(day)
    const { error } = await supabase.rpc("seed_shifts_range", { start_date: first, end_date: last, cap: 2 })
    if (error) {
      setErr(error.message)
      push({ type: "error", msg: error.message })
    } else {
      await loadDay(day)
      setMonthEmpty(false)
      push({ type: "success", msg: "Month seeded successfully" })
    }
    setPendingSeed(false)
  }

  async function loadDay(dateYMD: string) {
    setLoadingDay(true)
    setErr(null)
    const { data: sData, error: sErr } = await supabase
      .from("shifts")
      .select("*")
      .eq("shift_date", dateYMD)
      .order("slot")
    const shiftIds = (sData as Shift[] | null)?.map((s) => s.id) ?? []

    const { data: aData, error: aErr } = await supabase.from("shift_assignments").select("*").in("shift_id", shiftIds)
    if (aErr) setErr(aErr.message)

    setShifts((sData as Shift[]) ?? [])
    setAssignments((aData as Assignment[]) ?? [])

    const userIds = Array.from(new Set(((aData as Assignment[]) ?? []).map((a) => a.user_id)))
    if (userIds.length) {
      const { data: pData, error: pErr } = await supabase.from("profiles").select("id, name, phone").in("id", userIds)
      if (pErr) setErr(pErr.message)
      const map: Record<string, Profile> = {}
      ;(pData as Profile[] | null)?.forEach((p) => {
        map[p.id] = p
      })
      setNameMap(map)
    } else {
      setNameMap({})
    }
    setLoadingDay(false)
  }

  async function loadVols() {
    const { data, error } = await supabase.from("profiles").select("id, name, phone").order("name")
    if (error) setErr(error.message)
    setVols((data as Profile[]) ?? [])
  }

  const assignmentsByShift = useMemo(() => {
    const m = new Map<string, Assignment[]>()
    for (const a of assignments) {
      const arr = m.get(a.shift_id) || []
      arr.push(a)
      m.set(a.shift_id, arr)
    }
    return m
  }, [assignments])

  async function removeFrom(shiftId: string, userId: string) {
    const key = `${shiftId}-${userId}`
    if (pendingRemove === key) return
    setPendingRemove(key)
    const { error } = await supabase.from("shift_assignments").delete().match({ shift_id: shiftId, user_id: userId })
    if (error) {
      setErr(error.message)
      push({ type: "error", msg: error.message })
    } else {
      await loadDay(day)
      push({ type: "success", msg: "Volunteer removed" })
    }
    setPendingRemove(null)
  }

  async function addTo(shiftId: string, userId: string) {
    const key = `${shiftId}-${userId}`
    if (pendingAdd === key) return
    setPendingAdd(key)
    const { error } = await supabase.from("shift_assignments").insert({ shift_id: shiftId, user_id: userId })
    if (error) {
      setErr(error.message)
      push({ type: "error", msg: error.message })
    } else {
      await loadDay(day)
      push({ type: "success", msg: "Volunteer added" })
    }
    setPendingAdd(null)
  }

  return (
    <RequireAuth>
      <main className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin — Day View & Directory</h1>
          <p className="text-muted-foreground">Manage daily shifts and volunteer assignments</p>
        </div>

        {isAdmin === null && <p className="text-muted-foreground">Checking access...</p>}

        {isAdmin === false && (
          <Alert variant="destructive">
            <AlertDescription>Access denied. Admin only.</AlertDescription>
          </Alert>
        )}

        {isAdmin && (
          <>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="text-sm font-medium">Select day</label>
                  <Input type="date" className="w-full sm:w-48" value={day} onChange={(e) => setDay(e.target.value)} />
                  {monthEmpty && (
                    <Button
                      onClick={seedMonth}
                      variant="default"
                      size="sm"
                      disabled={pendingSeed}
                      className={`w-full sm:w-auto ${pendingSeed ? "opacity-60 cursor-wait" : ""}`}
                    >
                      {pendingSeed ? "Seeding..." : `Seed ${day.slice(0, 7)}`}
                    </Button>
                  )}
                </div>

                {loadingDay ? (
                  <div className="text-center py-8 text-muted-foreground">Loading day…</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {(["AM", "MID", "PM"] as const).map((slot) => {
                      const shift = shifts.find((s) => s.slot === slot)
                      const list = assignmentsByShift.get(shift?.id || "") || []

                      return (
                        <div key={slot} className="rounded-xl border bg-card p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="font-semibold">{slot}</div>
                            <div className="text-sm text-muted-foreground">
                              {list.length}/{shift?.capacity ?? 2}
                            </div>
                          </div>
                          <ul className="space-y-2">
                            {list.length === 0 && <li className="text-sm text-muted-foreground">No volunteers yet</li>}
                            {list.map((a) => {
                              const prof = nameMap[a.user_id]
                              const label = prof?.name || a.user_id.slice(0, 8)
                              const phone = prof?.phone ? ` · ${prof.phone}` : ""
                              const removeKey = `${shift!.id}-${a.user_id}`
                              const isRemoving = pendingRemove === removeKey
                              return (
                                <li
                                  key={a.id}
                                  className="flex items-center justify-between rounded-md bg-muted px-2 py-1"
                                >
                                  <span className="text-sm">
                                    {label}
                                    <span className="text-muted-foreground">{phone}</span>
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFrom(shift!.id, a.user_id)}
                                    disabled={isRemoving}
                                    className={isRemoving ? "opacity-60 cursor-wait" : ""}
                                  >
                                    {isRemoving ? "Removing..." : "Remove"}
                                  </Button>
                                </li>
                              )
                            })}
                          </ul>
                          <div className="mt-2">
                            <DirectoryPicker
                              vols={vols}
                              onPick={(uid) => addTo(shift!.id, uid)}
                              pendingAdd={pendingAdd}
                              shiftId={shift?.id || ""}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {err && (
                  <Alert variant="destructive">
                    <AlertDescription>{err}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </RequireAuth>
  )
}

function DirectoryPicker({
  vols,
  onPick,
  pendingAdd,
  shiftId,
}: {
  vols: { id: string; name: string | null; phone: string | null }[]
  onPick: (userId: string) => void
  pendingAdd: string | null
  shiftId: string
}) {
  const [search, setSearch] = useState("")
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vols.slice(0, 15)
    return vols
      .filter((v) => (v.name || "").toLowerCase().includes(q) || (v.phone || "").toLowerCase().includes(q))
      .slice(0, 15)
  }, [vols, search])

  return (
    <div>
      <Input
        className="mb-2 w-full"
        placeholder="Search name or phone"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="space-y-1">
        {filtered.map((v) => {
          const addKey = `${shiftId}-${v.id}`
          const isAdding = pendingAdd === addKey
          return (
            <button
              key={v.id}
              className={[
                "w-full rounded-md border bg-background px-3 py-2 text-left hover:bg-muted transition-colors",
                isAdding ? "opacity-60 cursor-wait" : "",
              ].join(" ")}
              onClick={() => onPick(v.id)}
              disabled={isAdding}
            >
              <div className="text-sm font-medium">{v.name || "Unnamed"}</div>
              <div className="text-xs text-muted-foreground">{v.phone || "No phone"}</div>
            </button>
          )
        })}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No matches.</p>}
      </div>
    </div>
  )
}
