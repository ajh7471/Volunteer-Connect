"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from 'next/navigation'
import { supabase } from "@/lib/supabaseClient"
import RequireAuth from "@/app/components/RequireAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ToastManager } from "@/lib/toast"
import { getUserProfile } from "@/app/admin/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type Profile = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  role: string | null
  created_at: string
  active: boolean | null
  last_sign_in_at?: string | null
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
  const [deactivating, setDeactivating] = useState(false)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState("volunteer")

  useEffect(() => {
    loadProfile()
    loadAssignments()
  }, [id])

  async function loadProfile() {
    const result = await getUserProfile(id)

    if (!result.success || !result.profile) {
      setError(result.error || "Failed to load profile")
      setProfile(null)
    } else {
      setProfile(result.profile as Profile)
      setName(result.profile.name || "")
      setPhone(result.profile.phone || "")
      setRole(result.profile.role || "volunteer")
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
    if (!name.trim()) {
      ToastManager.error("Name is required")
      return
    }

    if (phone && !/^\+?[\d\s-()]+$/.test(phone)) {
      ToastManager.error("Please enter a valid phone number")
      return
    }

    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase.from("profiles").update({ name, phone, role }).eq("id", id)

    if (updateError) {
      setError(updateError.message)
      ToastManager.error("Failed to update profile")
    } else {
      ToastManager.success("Profile updated successfully")
      setEditing(false)
      loadProfile()
    }
    setLoading(false)
  }

  async function handleDeactivate() {
    setDeactivating(true)

    const { error: updateError } = await supabase.from("profiles").update({ active: false }).eq("id", id)

    if (updateError) {
      ToastManager.error("Failed to deactivate account")
    } else {
      ToastManager.success("Account deactivated successfully")
      router.push("/admin/volunteers")
    }
    setDeactivating(false)
  }

  async function handleReactivate() {
    setLoading(true)

    const { error: updateError } = await supabase.from("profiles").update({ active: true }).eq("id", id)

    if (updateError) {
      ToastManager.error("Failed to reactivate account")
    } else {
      ToastManager.success("Account reactivated successfully")
      loadProfile()
    }
    setLoading(false)
  }

  if (!profile && !error) {
    return (
      <RequireAuth>
        <p className="text-center text-muted-foreground">Loading...</p>
      </RequireAuth>
    )
  }

  if (error && !profile) {
    return (
      <RequireAuth>
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => router.push("/admin/volunteers")}>
            Back to List
          </Button>
        </div>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {profile.name || "Unnamed"}
              {profile.active === false && (
                <Badge variant="destructive" className="ml-3">
                  Inactive
                </Badge>
              )}
            </h1>
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
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">Enter phone number with country code</p>
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
                    <Label className="text-muted-foreground">Status</Label>
                    <div>
                      <Badge variant={profile.active === false ? "destructive" : "default"}>
                        {profile.active === false ? "Inactive" : "Active"}
                      </Badge>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-muted-foreground">User ID</Label>
                    <p className="font-mono text-sm">{profile.id}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="text-lg">{profile.email || "Not set"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-muted-foreground">Last Sign In</Label>
                    <p className="text-lg">{profile.last_sign_in_at ? new Date(profile.last_sign_in_at).toLocaleDateString() : "Not set"}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions that affect this volunteer account</CardDescription>
          </CardHeader>
          <CardContent>
            {profile.active === false ? (
              <Button variant="default" onClick={handleReactivate} disabled={loading}>
                Reactivate Account
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deactivating}>
                    Deactivate Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will deactivate the volunteer account. They will no longer be able to log in or sign up for
                      shifts. Historical data will be preserved. You can reactivate the account later if needed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeactivate}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Deactivate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
