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
import { Loader2, User, Lock, Bell, Calendar, Download } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "@/lib/toast"

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

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      router.push("/auth/login")
      return
    }

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

  async function handleSaveProfile() {
    if (!profile) return

    setSaving(true)
    const { error } = await supabase
      .from("profiles")
      .update({
        name,
        phone,
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
    const { error } = await supabase.auth.updateUser({
      password: prompt("Enter new password:") || "",
    })

    if (error) {
      toast.error("Failed to change password")
    } else {
      toast.success("Password updated successfully!")
    }
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
                  <Input value={profile?.id || ""} disabled className="bg-muted" />
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
                    <Button variant="outline" onClick={handleChangePassword}>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RequireAuth>
  )
}
