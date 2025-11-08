"use client"

import RequireAuth from "@/app/components/RequireAuth"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/app/components/Toast"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Profile = {
  id: string
  name: string | null
  phone: string | null
  role: string | null
  created_at: string
}

export default function VolunteersPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [volunteers, setVolunteers] = useState<Profile[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", phone: "", role: "volunteer" })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const { push } = useToast()

  useEffect(() => {
    checkAdmin()
  }, [])

  useEffect(() => {
    if (isAdmin) loadVolunteers()
  }, [isAdmin])

  async function checkAdmin() {
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id
    if (!uid) return setIsAdmin(false)
    const { data } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle()
    setIsAdmin(data?.role === "admin")
  }

  async function loadVolunteers() {
    setLoading(true)
    const { data, error } = await supabase.from("profiles").select("id, name, phone, role, created_at").order("name")
    if (error) {
      push({ type: "error", msg: error.message })
    } else {
      setVolunteers((data as Profile[]) || [])
    }
    setLoading(false)
  }

  function openEdit(v: Profile) {
    setEditingId(v.id)
    setEditForm({ name: v.name || "", phone: v.phone || "", role: v.role || "volunteer" })
  }

  async function saveEdit() {
    if (!editingId || pending) return
    setPending(true)
    const { error } = await supabase
      .from("profiles")
      .update({ name: editForm.name, phone: editForm.phone, role: editForm.role })
      .eq("id", editingId)
    if (error) {
      push({ type: "error", msg: error.message })
    } else {
      push({ type: "success", msg: "Profile updated" })
      await loadVolunteers()
      setEditingId(null)
    }
    setPending(false)
  }

  async function confirmDelete() {
    if (!deleteId || pending) return
    setPending(true)
    // First delete all shift assignments
    const { error: assignError } = await supabase.from("shift_assignments").delete().eq("user_id", deleteId)
    if (assignError) {
      push({ type: "error", msg: assignError.message })
      setPending(false)
      return
    }
    // Then delete profile
    const { error } = await supabase.from("profiles").delete().eq("id", deleteId)
    if (error) {
      push({ type: "error", msg: error.message })
    } else {
      push({ type: "success", msg: "Volunteer deleted" })
      await loadVolunteers()
      setDeleteId(null)
    }
    setPending(false)
  }

  const filtered = volunteers.filter((v) => {
    const q = search.toLowerCase()
    return (
      (v.name || "").toLowerCase().includes(q) ||
      (v.phone || "").toLowerCase().includes(q) ||
      (v.role || "").toLowerCase().includes(q)
    )
  })

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

  return (
    <RequireAuth>
      <main className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Volunteer Management</h1>
            <p className="text-muted-foreground">Manage volunteer profiles and permissions</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin">Back to Admin</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Volunteers</CardTitle>
            <CardDescription>Find volunteers by name, phone, or role</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search by name, phone, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardContent>
        </Card>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading volunteers...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v) => (
              <Card key={v.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{v.name || "Unnamed"}</CardTitle>
                  <CardDescription>{v.phone || "No phone"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Role:</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        v.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {v.role || "volunteer"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Joined: {new Date(v.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild className="flex-1 bg-transparent">
                      <Link href={`/admin/volunteers/${v.id}`}>View</Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(v)} className="flex-1">
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteId(v.id)} className="flex-1">
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <div className="py-8 text-center text-muted-foreground">No volunteers found</div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Volunteer</DialogTitle>
              <DialogDescription>Update volunteer information and permissions</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editForm.role} onValueChange={(val) => setEditForm({ ...editForm, role: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingId(null)} disabled={pending}>
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={pending}>
                {pending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Volunteer</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this volunteer? This will remove all their shift assignments. This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={pending}>
                {pending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </RequireAuth>
  )
}
