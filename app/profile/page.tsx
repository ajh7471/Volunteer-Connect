"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import RequireAuth from "@/app/components/RequireAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, Lock, Bell, Calendar, Download, Eye, EyeOff } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "@/lib/toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Profile = {
  id: string
  name: string
  phone: string
  email_opt_in: boolean
  email_categories: {
    reminders: boolean
    confirmations: boolean
    promotional: boolean
    urgent: boolean
  }
  avatar_url?: string
  calendar_sync_enabled: boolean
  calendar_sync_token: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState("")

  // Form fields
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [emailOptIn, setEmailOptIn] = useState(true)
  const [emailCategories, setEmailCategories] = useState({
    reminders: true,
    confirmations: true,
    promotional: false,
    urgent: true,
  })
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false)

  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      router.push("/auth/login")
      return
    }

    setEmail(userData.user.email || "")

    const { data, error } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single()

    if (error || !data) {
      toast.error("Failed to load profile")
      setLoading(false)
      return
    }

    const profileData = data as Profile
    setProfile(profileData)
    setName(profileData.name || "")
    setPhone(profileData.phone || "")
    setEmailOptIn(profileData.email_opt_in ?? true)
    setEmailCategories(
      profileData.email_categories || {
        reminders: true,
        confirmations: true,
        promotional: false,
        urgent: true,
      },
    )
    setCalendarSyncEnabled(profileData.calendar_sync_enabled ?? false)
    setLoading(false)
  }

  function sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .trim()
      .slice(0, 255) // Limit length
  }

  function sanitizePhone(input: string): string {
    return input
      .replace(/[^\d\s\-$$$$+]/g, "") // Only allow digits, spaces, dashes, parentheses, plus
      .trim()
      .slice(0, 20)
  }

  async function handleSaveProfile() {
    if (!profile) return

    const sanitizedName = sanitizeInput(name)
    const sanitizedPhone = sanitizePhone(phone)

    if (sanitizedName.length < 1) {
      toast.error("Name cannot be empty")
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from("profiles")
      .update({
        name: sanitizedName,
        phone: sanitizedPhone,
        email_opt_in: emailOptIn,
        email_categories: emailCategories,
        calendar_sync_enabled: calendarSyncEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)

    if (error) {
      toast.error("Failed to update profile")
    } else {
      toast.success("Profile updated successfully!")
      await loadProfile()
    }
    setSaving(false)
  }

  async function handleChangePassword() {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    // Password strength validation
    const hasUppercase = /[A-Z]/.test(newPassword)
    const hasLowercase = /[a-z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      toast.error("Password must contain uppercase, lowercase, and number")
      return
    }

    setChangingPassword(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      toast.error("Failed to change password: " + error.message)
    } else {
      toast.success("Password updated successfully!")
      setShowPasswordDialog(false)
      setNewPassword("")
      setConfirmPassword("")
    }
    setChangingPassword(false)
  }

  function getCalendarSyncUrl() {
    if (!profile?.calendar_sync_token) return ""
    return `${window.location.origin}/api/calendar/sync/${profile.calendar_sync_token}`
  }

  function copyCalendarUrl() {
    const url = getCalendarSyncUrl()
    navigator.clipboard.writeText(url)
    toast.success("Calendar URL copied to clipboard!")
  }

  if (loading) {
    return (
      <RequireAuth>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="mr-2 h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="mr-2 h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed. Contact admin if needed.</p>
                </div>

                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>Choose which emails you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email-opt-in"
                    checked={emailOptIn}
                    onCheckedChange={(checked) => setEmailOptIn(!!checked)}
                  />
                  <Label htmlFor="email-opt-in" className="cursor-pointer">
                    <span className="font-medium">Enable email notifications</span>
                    <p className="text-sm text-muted-foreground">Master switch for all email communications</p>
                  </Label>
                </div>

                {emailOptIn && (
                  <div className="ml-6 space-y-4 border-l-2 pl-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="reminders"
                        checked={emailCategories.reminders}
                        onCheckedChange={(checked) => setEmailCategories({ ...emailCategories, reminders: !!checked })}
                      />
                      <Label htmlFor="reminders" className="cursor-pointer">
                        <span className="font-medium">Shift Reminders</span>
                        <p className="text-sm text-muted-foreground">Get reminded 24 hours before your shifts</p>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="confirmations"
                        checked={emailCategories.confirmations}
                        onCheckedChange={(checked) =>
                          setEmailCategories({ ...emailCategories, confirmations: !!checked })
                        }
                      />
                      <Label htmlFor="confirmations" className="cursor-pointer">
                        <span className="font-medium">Shift Confirmations</span>
                        <p className="text-sm text-muted-foreground">
                          Receive confirmation when you sign up for shifts
                        </p>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="promotional"
                        checked={emailCategories.promotional}
                        onCheckedChange={(checked) =>
                          setEmailCategories({ ...emailCategories, promotional: !!checked })
                        }
                      />
                      <Label htmlFor="promotional" className="cursor-pointer">
                        <span className="font-medium">Promotional Emails</span>
                        <p className="text-sm text-muted-foreground">
                          Updates about events and volunteer opportunities
                        </p>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="urgent"
                        checked={emailCategories.urgent}
                        onCheckedChange={(checked) => setEmailCategories({ ...emailCategories, urgent: !!checked })}
                      />
                      <Label htmlFor="urgent" className="cursor-pointer">
                        <span className="font-medium">Urgent Notifications</span>
                        <p className="text-sm text-muted-foreground">
                          Last-minute coverage requests and important updates
                        </p>
                      </Label>
                    </div>
                  </div>
                )}

                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Preferences"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Calendar Sync</CardTitle>
                  <CardDescription>
                    Automatically sync your shifts to Google Calendar, Outlook, or Apple Calendar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="calendar-sync"
                      checked={calendarSyncEnabled}
                      onCheckedChange={(checked) => setCalendarSyncEnabled(!!checked)}
                    />
                    <Label htmlFor="calendar-sync" className="cursor-pointer">
                      Enable automatic calendar sync
                    </Label>
                  </div>

                  {calendarSyncEnabled && (
                    <div className="rounded-lg border p-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-2">Your Personal Calendar URL:</p>
                        <div className="flex gap-2">
                          <Input value={getCalendarSyncUrl()} readOnly className="font-mono text-xs" />
                          <Button size="sm" variant="outline" onClick={copyCalendarUrl}>
                            Copy
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Add this URL to your calendar app to automatically sync your volunteer shifts. Keep this URL
                        private - it's unique to you!
                      </p>
                    </div>
                  )}

                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Export Calendar</CardTitle>
                  <CardDescription>Download your shifts as a calendar file</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full bg-transparent" asChild>
                    <a href="/api/calendar/export" download>
                      <Download className="mr-2 h-4 w-4" />
                      Download All Shifts (.ics)
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your password and security preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <Input type="password" value="••••••••" disabled className="bg-muted" />
                    <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
                      Change
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-2">Account Security</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last login</span>
                      <Badge variant="outline">Just now</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Account created</span>
                      <Badge variant="outline">{profile && new Date(profile.id).toLocaleDateString()}</Badge>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <h4 className="font-medium mb-2">Password Requirements</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• At least 8 characters long</li>
                    <li>• Contains uppercase letter (A-Z)</li>
                    <li>• Contains lowercase letter (a-z)</li>
                    <li>• Contains number (0-9)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your new password. Make sure it meets the security requirements.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {newPassword && (
                <div className="text-sm space-y-1">
                  <p className={newPassword.length >= 8 ? "text-green-600" : "text-red-600"}>
                    {newPassword.length >= 8 ? "✓" : "✗"} At least 8 characters
                  </p>
                  <p className={/[A-Z]/.test(newPassword) ? "text-green-600" : "text-red-600"}>
                    {/[A-Z]/.test(newPassword) ? "✓" : "✗"} Uppercase letter
                  </p>
                  <p className={/[a-z]/.test(newPassword) ? "text-green-600" : "text-red-600"}>
                    {/[a-z]/.test(newPassword) ? "✓" : "✗"} Lowercase letter
                  </p>
                  <p className={/[0-9]/.test(newPassword) ? "text-green-600" : "text-red-600"}>
                    {/[0-9]/.test(newPassword) ? "✓" : "✗"} Number
                  </p>
                  {confirmPassword && (
                    <p className={newPassword === confirmPassword ? "text-green-600" : "text-red-600"}>
                      {newPassword === confirmPassword ? "✓" : "✗"} Passwords match
                    </p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequireAuth>
  )
}
