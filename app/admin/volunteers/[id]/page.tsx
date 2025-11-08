"use client"

import RequireAuth from "@/app/components/RequireAuth"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

type Profile = {
  id: string
  name: string | null
  phone: string | null
  role: string | null
  created_at: string
}

type ShiftAssignment = {
  id: string
  shift_id: string
  created_at: string
  shifts: {
    shift_date: string
    slot: string
    start_time: string | null
    end_time: string | null
  }
}

export default function VolunteerDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  useEffect(() => {
    if (isAdmin && params?.id) loadData()
  }, [isAdmin, params?.id])

  async function checkAdmin() {
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id
    if (!uid) return setIsAdmin(false)
    const { data } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle()
    setIsAdmin(data?.role === "admin")
  }

  async function loadData() {
    setLoading(true)
    setError(null)

    // Load profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", params.id)
      .maybeSingle()

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    if (!profileData) {
      setError("Volunteer not found")
      setLoading(false)
      return
    }

    setProfile(profileData as Profile)

    // Load shift assignments with shift details
    const { data: assignData, error: assignError } = await supabase
      .from("shift_assignments")
      .select(
        `
        id,
        shift_id,
        created_at,
        shifts (
          shift_date,
          slot,
          start_time,
          end_time
        )
      `,
      )
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })

    if (assignError) {
      setError(assignError.message)
    } else {
      setAssignments((assignData as any) || [])
    }

    setLoading(false)
  }

  const upcomingShifts = assignments.filter((a) => new Date(a.shifts.shift_date) >= new Date(new Date().toDateString()))
  const pastShifts = assignments.filter((a) => new Date(a.shifts.shift_date) < new Date(new Date().toDateString()))

  if (isAdmin === null)
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>Checking access...</p>
      </div>
    )

  if (isAdmin === false) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Access denied. Admin only.</AlertDescription>
      </Alert>
    )
  }

  if (loading)
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>Loading volunteer details...</p>
      </div>
    )

  if (error || !profile) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{error || "Volunteer not found"}</AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/admin/volunteers">Back to Volunteers</Link>
        </Button>
      </div>
    )
  }

  return (
    <RequireAuth>
      <main className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{profile.name || "Unnamed Volunteer"}</h1>
            <p className="text-muted-foreground">Volunteer profile and shift history</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/volunteers">Back to Volunteers</Link>
          </Button>
        </div>

        {/* Profile Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Phone</div>
                <div>{profile.phone || "Not provided"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Role</div>
                <div className="capitalize">{profile.role || "volunteer"}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Total Shifts</div>
                <div className="text-2xl font-bold">{assignments.length}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Upcoming</div>
                <div className="text-2xl font-bold text-blue-600">{upcomingShifts.length}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Member Since</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Date(profile.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </div>
              <div className="text-sm text-muted-foreground">
                {Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))}{" "}
                days ago
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Shifts */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Shifts ({upcomingShifts.length})</CardTitle>
            <CardDescription>Scheduled volunteer shifts</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingShifts.length === 0 ? (
              <p className="text-muted-foreground">No upcoming shifts</p>
            ) : (
              <div className="space-y-2">
                {upcomingShifts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="font-medium">
                        {new Date(a.shifts.shift_date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground">{a.shifts.slot}</div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/day/${a.shifts.shift_date}`}>View Day</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past Shifts */}
        <Card>
          <CardHeader>
            <CardTitle>Past Shifts ({pastShifts.length})</CardTitle>
            <CardDescription>Completed volunteer shifts</CardDescription>
          </CardHeader>
          <CardContent>
            {pastShifts.length === 0 ? (
              <p className="text-muted-foreground">No past shifts</p>
            ) : (
              <div className="space-y-2">
                {pastShifts.slice(0, 10).map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="font-medium">
                        {new Date(a.shifts.shift_date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground">{a.shifts.slot}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                ))}
                {pastShifts.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    Showing 10 of {pastShifts.length} past shifts
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </RequireAuth>
  )
}
