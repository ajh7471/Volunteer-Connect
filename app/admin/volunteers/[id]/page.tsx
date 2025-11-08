"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import RequireAuth from "@/app/components/RequireAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

type Profile = {
  id: string
  name: string | null
  phone: string | null
  role: string | null
  created_at: string
}

type Assignment = {
  id: string
  shift: {
    shift_date: string
    slot: string
  }
}

export default function VolunteerProfilePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState("volunteer")

  useEffect(() => {
    loadProfile()
    loadAssignments()
  }, [id])

  async function loadProfile() {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single()

    if (error) {
      setError("Failed to load profile")
    } else if (data) {
      setProfile(data as Profile)
      setName(data.name || "")
      setPhone(data.phone || "")
      setRole(data.role || "volunteer")
    }
  }

  async function loadAssignments() {
    const { data } = await supabase
      .from("shift_assignments")
      .select("id, shift:shifts(shift_date, slot)")
      .eq("user_id", id)
      .order("id", { ascending: false })
      .limit(10)

    if (data) {
      setAssignments(data as any)
    }
  }

  async function handleSave() {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error: updateError } = await supabase.from("profiles").update({ name, phone, role }).eq("id", id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess("Profile updated successfully")
      setEditing(false)
      loadProfile()
    }
    setLoading(false)
  }

  if (!profile) {
    return (
      <RequireAuth>
        <p className="text-center text-muted-foreground">Loading...</p>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{profile.name || "Unnamed"}</h1>
            <p className="text-muted-foreground">Volunteer Profile</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/admin/volunteers")}>
            Back to List
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Profile Information</CardTitle>
              {!editing && (
                <Button onClick={() => setEditing(true)} size="sm">
                  Edit
                </Button>
              )}
            </div>
            <CardDescription>Joined {new Date(profile.created_at).toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={setRole} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volunteer">Volunteer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false)
                      setName(profile.name || "")
                      setPhone(profile.phone || "")
                      setRole(profile.role || "volunteer")
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="text-lg">{profile.name || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="text-lg">{profile.phone || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Role</Label>
                    <div>
                      <Badge variant={profile.role === "admin" ? "default" : "secondary"}>
                        {profile.role || "volunteer"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">User ID</Label>
                    <p className="font-mono text-sm">{profile.id}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Shift Assignments</CardTitle>
            <CardDescription>Last 10 shifts assigned to this volunteer</CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-center text-muted-foreground">No assignments yet</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">
                        {a.shift?.shift_date} - {a.shift?.slot}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  )
}
