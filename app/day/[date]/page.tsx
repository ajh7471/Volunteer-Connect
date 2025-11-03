"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Row = { slot: "AM" | "MID" | "PM" | string; first_name: string | null }

export default function DayRosterPage() {
  const params = useParams<{ date: string }>()
  const date = (params?.date as string) || ""

  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setErr("Invalid date")
      return
    }
    ;(async () => {
      setErr(null)
      const { data, error } = await supabase.rpc("day_roster", { d: date })
      if (error) setErr(error.message)
      setRows((data as Row[]) || [])
    })()
  }, [date])

  const bySlot = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const row of rows) {
      const list = m.get(row.slot) || []
      if (row.first_name) list.push(row.first_name)
      m.set(row.slot, list)
    }
    return m
  }, [rows])

  return (
    <main className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">Roster — {date}</h1>
        <Button asChild variant="outline" className="w-full sm:w-auto bg-transparent">
          <Link href="/calendar">Back to calendar</Link>
        </Button>
      </div>

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(["AM", "MID", "PM"] as const).map((slot) => {
          const list = bySlot.get(slot) || []
          return (
            <Card key={slot}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{slot}</CardTitle>
                  <span className="text-sm text-muted-foreground">{list.length}/2</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {list.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No volunteers yet</p>
                ) : (
                  <ul className="space-y-2">
                    {list.map((n, i) => (
                      <li key={i} className="rounded-md bg-muted px-3 py-2 text-sm">
                        {n}
                      </li>
                    ))}
                  </ul>
                )}
                <CardDescription className="text-xs">First names only. Contact details hidden.</CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </main>
  )
}
