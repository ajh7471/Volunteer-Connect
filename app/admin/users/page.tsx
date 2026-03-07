"use client"

/**
 * ADMIN USER MANAGEMENT PAGE
 */

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import RequireAuth from "@/app/components/RequireAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/lib/toast"
import { UserPlus, Shield, Ban, Trash2, Calendar } from "lucide-react"
import { createUserAccount, deleteUserAccount, updateUserRole, assignShiftToUser, getAdminUsers } from "../actions"

type User = {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: string
  active: boolean | null
  email_opt_in: boolean | null
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [blockedEmails, setBlockedEmails] = useState<string[]>([])
  const [showAssignShiftModal, setShowAssignShiftModal] = useState(false)
  const [selectedUserForShift, setSelectedUserForShift] = useState<User | null>(null)
  const [availableShifts, setAvailableShifts] = useState<any[]>([])
  const [selectedShiftId, setSelectedShiftId] = useState("")

  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    role: "volunteer",
  })

  const [blockEmail, setBlockEmail] = useState("")
  const [blockReason, setBlockReason] = useState("")

  useEffect(() => {
    loadUsers()
    loadBlockedEmails()
    loadAvailableShifts()
  }, [])

  async function loadUsers() {
    setLoading(true)
    const result = await getAdminUsers()
    if (result.success && result.users) {
      setUsers(result.users as User[])
    } else {
      toast.error(result.error || "Failed to load users")
    }
    setLoading(false)
  }

  async function loadBlockedEmails() {
    const { data } = await supabase.from("auth_blocklist").select("email")
    if (data) setBlockedEmails(data.map((row: { email: string }) => row.email))
  }

  async function loadAvailableShifts() {
    const today = new Date().toISOString().split("T")[0]
    const { data: shifts } = await supabase
      .from("shifts")
      .select("*, shift_assignments(count)")
      .gte("shift_date", today)
      .order("shift_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(50)
    if (shifts) setAvailableShifts(shifts)
  }

  async function handleCreateUser() {
    if (!newUser.email || !newUser.password || !newUser.name) {
      toast.error("Please fill in all required fields")
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newUser.email)) { toast.error("Please enter a valid email address"); return }
    if (newUser.password.length < 8) { toast.error("Password must be at least 8 characters"); return }
    if (newUser.password !== newUser.confirmPassword) { toast.error("Passwords do not match"); return }
    if (blockedEmails.includes(newUser.email.toLowerCase())) { toast.error("This email address is blocked"); return }

    const result = await createUserAccount({ ...newUser, role: newUser.role as "volunteer" | "admin" })
    if (result.success) {
      toast.success(`User ${newUser.name} created successfully`)
      setShowCreateModal(false)
      setNewUser({ email: "", password: "", confirmPassword: "", name: "", phone: "", role: "volunteer" })
      loadUsers()
    } else {
      toast.error(result.error || "Failed to create user")
    }
  }

  async function handleBlockEmail() {
    if (!blockEmail) { toast.error("Please enter an email address"); return }
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const { error } = await supabase.from("auth_blocklist").insert({
        email: blockEmail.toLowerCase(),
        blocked_by: sessionData.session?.user?.id,
        reason: blockReason,
      })
      if (error) throw error
      toast.success(`${blockEmail} has been blocked`)
      setShowBlockModal(false)
      setBlockEmail("")
      setBlockReason("")
      loadBlockedEmails()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to block email")
    }
  }

  async function handleUnblockEmail(email: string) {
    if (!confirm(`Are you sure you want to unblock ${email}?`)) return
    const { error } = await supabase.from("auth_blocklist").delete().eq("email", email)
    if (error) { toast.error("Failed to unblock email") } else { toast.success(`${email} has been unblocked`); loadBlockedEmails() }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) return
    const result = await deleteUserAccount(userId)
    if (result.success) { toast.success("User deleted successfully"); loadUsers() }
    else toast.error(result.error || "Failed to delete user")
  }

  async function handleToggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === "admin" ? "volunteer" : "admin"
    if (currentRole === "admin" && !confirm("Are you sure you want to demote this user from admin to volunteer?")) return
    const result = await updateUserRole(userId, newRole)
    if (result.success) { toast.success(`User role updated to ${newRole}`); loadUsers() }
    else toast.error(result.error || "Failed to update role")
  }

  function openAssignShiftModal(user: User) {
    setSelectedUserForShift(user)
    setSelectedShiftId("")
    setShowAssignShiftModal(true)
  }

  async function handleAssignShift() {
    if (!selectedUserForShift || !selectedShiftId) { toast.error("Please select a shift"); return }
    const result = await assignShiftToUser(selectedUserForShift.id, selectedShiftId)
    if (result.success) { toast.success("Shift assigned successfully"); setShowAssignShiftModal(false); loadAvailableShifts() }
    else toast.error(result.error || "Failed to assign shift")
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Create users, manage roles, and block emails</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowBlockModal(true)}>
              <Ban className="mr-2 h-3.5 w-3.5" />
              Block Email
            </Button>
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <UserPlus className="mr-2 h-3.5 w-3.5" />
              Create User
            </Button>
          </div>
        </div>

        {/* Users table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">All Users ({users.length})</CardTitle>
            <CardDescription className="text-xs">Manage user accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-sm text-muted-foreground py-6">Loading users...</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Phone</TableHead>
                      <TableHead className="text-xs">Role</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Opt-In</TableHead>
                      <TableHead className="text-right text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="text-sm font-medium">{user.name || "Unnamed"}</TableCell>
                        <TableCell className="text-sm">{user.email}</TableCell>
                        <TableCell className="text-sm">{user.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.active === false ? "destructive" : "default"} className="text-xs">
                            {user.active === false ? "Inactive" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.email_opt_in ? "default" : "outline"} className="text-xs">
                            {user.email_opt_in ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openAssignShiftModal(user)} title="Assign shift">
                              <Calendar className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => handleToggleRole(user.id, user.role)} title="Toggle role">
                              <Shield className="h-3 w-3" />
                            </Button>
                            <Button variant="destructive" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteUser(user.id, user.name || "this user")} title="Delete user">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blocked emails */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Blocked Emails ({blockedEmails.length})</CardTitle>
            <CardDescription className="text-xs">Email addresses that cannot register</CardDescription>
          </CardHeader>
          <CardContent>
            {blockedEmails.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No blocked emails</p>
            ) : (
              <div className="space-y-2">
                {blockedEmails.map((email) => (
                  <div key={email} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-mono text-sm">{email}</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleUnblockEmail(email)}>
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Create User Dialog ─────────────────────────────────────────── */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-md p-0 gap-0">
            <DialogHeader className="px-5 pt-5 pb-4 border-b">
              <DialogTitle className="text-base font-semibold">Create New User</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add a new volunteer or admin account
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[70vh]">
              <div className="px-5 py-4 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name *</Label>
                  <Input
                    className="h-9 text-sm"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email *</Label>
                  <Input
                    className="h-9 text-sm"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    className="h-9 text-sm"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Password *</Label>
                  <Input
                    className="h-9 text-sm"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Confirm Password *</Label>
                  <Input
                    className="h-9 text-sm"
                    type="password"
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                  />
                  {newUser.password && newUser.confirmPassword && newUser.password !== newUser.confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Role</Label>
                  <Select value={newUser.role} onValueChange={(val) => setNewUser({ ...newUser, role: val })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volunteer">Volunteer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>

            <div className="px-5 py-3 border-t flex gap-2">
              <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1 h-9 text-sm" onClick={handleCreateUser}>
                Create User
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Block Email Dialog ─────────────────────────────────────────── */}
        <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
          <DialogContent className="sm:max-w-md p-0 gap-0">
            <DialogHeader className="px-5 pt-5 pb-4 border-b">
              <DialogTitle className="text-base font-semibold">Block Email Address</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Prevent an email from registering
              </DialogDescription>
            </DialogHeader>

            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Email Address *</Label>
                <Input
                  className="h-9 text-sm"
                  type="email"
                  value={blockEmail}
                  onChange={(e) => setBlockEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reason (optional)</Label>
                <Input
                  className="h-9 text-sm"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Why is this email being blocked?"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t flex gap-2">
              <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => setShowBlockModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1 h-9 text-sm" onClick={handleBlockEmail}>
                Block Email
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Assign Shift Dialog ────────────────────────────────────────── */}
        <Dialog open={showAssignShiftModal} onOpenChange={setShowAssignShiftModal}>
          <DialogContent className="sm:max-w-md p-0 gap-0">
            <DialogHeader className="px-5 pt-5 pb-4 border-b">
              <DialogTitle className="text-base font-semibold">
                Assign Shift — {selectedUserForShift?.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Select an upcoming shift to assign to this volunteer
              </DialogDescription>
            </DialogHeader>

            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Available Shifts</Label>
                <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select a shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableShifts.map((shift) => {
                      const assignedCount = shift.shift_assignments?.[0]?.count || 0
                      const spotsLeft = shift.capacity - assignedCount
                      const isFull = spotsLeft <= 0
                      return (
                        <SelectItem key={shift.id} value={shift.id} disabled={isFull}>
                          {shift.shift_date} · {shift.start_time}–{shift.end_time} ({spotsLeft} spots)
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="px-5 py-3 border-t flex gap-2">
              <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => setShowAssignShiftModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1 h-9 text-sm" onClick={handleAssignShift} disabled={!selectedShiftId}>
                Assign Shift
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RequireAuth>
  )
}
