"use client"

/**
 * ADMIN USER MANAGEMENT PAGE
 *
 * Comprehensive interface for managing user accounts including:
 * - Creating new volunteer and admin accounts
 * - Blocking and unblocking email addresses
 * - Deleting user accounts with cascade cleanup
 * - Changing user roles (volunteer ↔ admin)
 * - Assigning and revoking shifts
 *
 * @test-scope: Admin user management - complete UI with all CRUD operations
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/lib/toast"
import { UserPlus, Shield, Ban, Trash2, Calendar } from "lucide-react"
import { createUserAccount, deleteUserAccount, updateUserRole, assignShiftToUser } from "../actions"

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

  // Create user form
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    role: "volunteer",
  })

  // Block email form
  const [blockEmail, setBlockEmail] = useState("")
  const [blockReason, setBlockReason] = useState("")

  useEffect(() => {
    loadUsers()
    loadBlockedEmails()
    loadAvailableShifts()
  }, [])

  async function loadUsers() {
    setLoading(true)

    // Get all profiles with emails from auth.users
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

    if (profiles) {
      // Get emails from auth metadata if available
      const enrichedUsers = await Promise.all(
        profiles.map(async (profile) => {
          const { data } = await supabase.auth.admin.getUserById(profile.id)
          return {
            ...profile,
            email: data.user?.email || "No email",
          }
        }),
      )
      setUsers(enrichedUsers as User[])
    }

    setLoading(false)
  }

  async function loadBlockedEmails() {
    const { data } = await supabase.from("auth_blocklist").select("email")
    if (data) {
      setBlockedEmails(data.map((row) => row.email))
    }
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

    if (shifts) {
      setAvailableShifts(shifts)
    }
  }

  async function handleCreateUser() {
    if (!newUser.email || !newUser.password || !newUser.name) {
      toast.error("Please fill in all required fields")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newUser.email)) {
      toast.error("Please enter a valid email address")
      return
    }

    if (newUser.password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    if (blockedEmails.includes(newUser.email.toLowerCase())) {
      toast.error("This email address is blocked")
      return
    }

    const result = await createUserAccount(newUser)

    if (result.success) {
      toast.success(`User ${newUser.name} created successfully`)
      setShowCreateModal(false)
      setNewUser({ email: "", password: "", name: "", phone: "", role: "volunteer" })
      loadUsers()
    } else {
      toast.error(result.error || "Failed to create user")
    }
  }

  async function handleBlockEmail() {
    if (!blockEmail) {
      toast.error("Please enter an email address")
      return
    }

    try {
      const { data: authUser } = await supabase.auth.getUser()

      const { error } = await supabase.from("auth_blocklist").insert({
        email: blockEmail.toLowerCase(),
        blocked_by: authUser.user?.id,
        reason: blockReason,
      })

      if (error) throw error

      toast.success(`${blockEmail} has been blocked`)
      setShowBlockModal(false)
      setBlockEmail("")
      setBlockReason("")
      loadBlockedEmails()
    } catch (error: any) {
      toast.error(error.message || "Failed to block email")
    }
  }

  async function handleUnblockEmail(email: string) {
    if (!confirm(`Are you sure you want to unblock ${email}?`)) return

    const { error } = await supabase.from("auth_blocklist").delete().eq("email", email)

    if (error) {
      toast.error("Failed to unblock email")
    } else {
      toast.success(`${email} has been unblocked`)
      loadBlockedEmails()
    }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) return

    const result = await deleteUserAccount(userId)

    if (result.success) {
      toast.success("User deleted successfully")
      loadUsers()
    } else {
      toast.error(result.error || "Failed to delete user")
    }
  }

  async function handleToggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === "admin" ? "volunteer" : "admin"

    if (currentRole === "admin") {
      if (!confirm(`Are you sure you want to demote this user from admin to volunteer?`)) return
    }

    const result = await updateUserRole(userId, newRole)

    if (result.success) {
      toast.success(`User role updated to ${newRole}`)
      loadUsers()
    } else {
      toast.error(result.error || "Failed to update role")
    }
  }

  function openAssignShiftModal(user: User) {
    setSelectedUserForShift(user)
    setSelectedShiftId("")
    setShowAssignShiftModal(true)
  }

  async function handleAssignShift() {
    if (!selectedUserForShift || !selectedShiftId) {
      toast.error("Please select a shift")
      return
    }

    const result = await assignShiftToUser(selectedUserForShift.id, selectedShiftId)

    if (result.success) {
      toast.success("Shift assigned successfully")
      setShowAssignShiftModal(false)
      loadAvailableShifts()
    } else {
      toast.error(result.error || "Failed to assign shift")
    }
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">Create users, manage roles, and block emails</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowBlockModal(true)}>
              <Ban className="mr-2 h-4 w-4" />
              Block Email
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground">Loading users...</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Email Opt-In</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name || "Unnamed"}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.active === false ? "destructive" : "default"}>
                            {user.active === false ? "Inactive" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.email_opt_in ? "default" : "outline"}>
                            {user.email_opt_in ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAssignShiftModal(user)}
                              title="Assign shift"
                            >
                              <Calendar className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleRole(user.id, user.role)}
                              title="Toggle role"
                            >
                              <Shield className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id, user.name || "this user")}
                              title="Delete user"
                            >
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

        {/* Blocked Emails */}
        <Card>
          <CardHeader>
            <CardTitle>Blocked Emails ({blockedEmails.length})</CardTitle>
            <CardDescription>Email addresses that cannot register</CardDescription>
          </CardHeader>
          <CardContent>
            {blockedEmails.length === 0 ? (
              <p className="text-center text-muted-foreground">No blocked emails</p>
            ) : (
              <div className="space-y-2">
                {blockedEmails.map((email) => (
                  <div key={email} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-mono text-sm">{email}</span>
                    <Button variant="outline" size="sm" onClick={() => handleUnblockEmail(email)}>
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create User Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Add a new volunteer or admin account</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Full Name *</Label>
                <Input
                  id="new-name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">Email *</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-phone">Phone</Label>
                <Input
                  id="new-phone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Password *</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role">Role</Label>
                <Select value={newUser.role} onValueChange={(val) => setNewUser({ ...newUser, role: val })}>
                  <SelectTrigger id="new-role">
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
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Block Email Modal */}
        <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Block Email Address</DialogTitle>
              <DialogDescription>Prevent an email from registering</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="block-email">Email Address *</Label>
                <Input
                  id="block-email"
                  type="email"
                  value={blockEmail}
                  onChange={(e) => setBlockEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-reason">Reason (optional)</Label>
                <Input
                  id="block-reason"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Why is this email being blocked?"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBlockModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleBlockEmail}>
                Block Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAssignShiftModal} onOpenChange={setShowAssignShiftModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Shift to {selectedUserForShift?.name}</DialogTitle>
              <DialogDescription>Select an available shift to assign to this volunteer</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shift-select">Available Shifts</Label>
                <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                  <SelectTrigger id="shift-select">
                    <SelectValue placeholder="Select a shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableShifts.map((shift) => {
                      const assignedCount = shift.shift_assignments?.[0]?.count || 0
                      const spotsLeft = shift.capacity - assignedCount
                      const isFull = spotsLeft <= 0

                      return (
                        <SelectItem key={shift.id} value={shift.id} disabled={isFull}>
                          {shift.shift_date} • {shift.start_time} - {shift.end_time} ({spotsLeft} spots left)
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignShiftModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignShift} disabled={!selectedShiftId}>
                Assign Shift
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequireAuth>
  )
}
