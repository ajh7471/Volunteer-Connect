"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import RequireAuth from "@/app/components/RequireAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, FileText, UserCog, Mail } from "lucide-react"
import { useSessionRole } from "@/lib/useSession"

export default function AdminDashboard() {
  const router = useRouter()
  const { role, loading: roleLoading } = useSessionRole()
  const isAdmin = roleLoading ? null : role === "admin"
  const [stats, setStats] = useState({ volunteers: 0, shifts: 0, assignments: 0 })

  useEffect(() => {
    if (isAdmin === true) {
      loadStats()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const loadStats = async () => {
    try {
      const [volData, shiftData, assignData] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("shifts").select("id", { count: "exact", head: true }),
        supabase.from("shift_assignments").select("id", { count: "exact", head: true }),
      ])
      setStats({
        volunteers: volData.count || 0,
        shifts: shiftData.count || 0,
        assignments: assignData.count || 0,
      })
    } catch (e) {
      console.error("[v0] Stats load error:", e)
    }
  }

  if (isAdmin === false) {
    return (
      <RequireAuth>
        <Card className="mx-auto mt-8 max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access this page.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button className="min-h-[44px]" onClick={() => router.push("/calendar")}>Go to Calendar</Button>
            <Button className="min-h-[44px]" variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = "/"
              }}
            >
              Logout
            </Button>
          </CardContent>
        </Card>
      </RequireAuth>
    )
  }

  if (isAdmin === null) {
    return (
      <RequireAuth>
        <div className="mx-auto mt-8 max-w-md text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground">Checking permissions...</p>
          </div>
        </div>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage volunteers and shifts for Vanderpump Dogs</p>
        </div>

        {/* Primary actions - large, prominent CTAs */}
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/admin/shifts" className="group block">
            <Card className="border-2 border-primary/30 hover:border-primary/60 transition-all hover:shadow-xl hover:shadow-primary/10 h-full bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 group-hover:bg-primary/20 transition-colors mb-4">
                  <Calendar className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-1">Shift Management</h2>
                <p className="text-muted-foreground">
                  Create and manage shifts, assign volunteers, bulk operations for recurring schedules
                </p>
                <div className="mt-4 flex items-center text-sm font-medium text-primary group-hover:underline">
                  Open Shift Manager
                  <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users" className="group block">
            <Card className="border-2 border-primary/30 hover:border-primary/60 transition-all hover:shadow-xl hover:shadow-primary/10 h-full bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 group-hover:bg-primary/20 transition-colors mb-4">
                  <UserCog className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-1">User Management</h2>
                <p className="text-muted-foreground">
                  Create accounts, manage roles and permissions, block emails, delete users
                </p>
                <div className="mt-4 flex items-center text-sm font-medium text-primary group-hover:underline">
                  Manage Users
                  <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Secondary actions */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/admin/volunteers" className="group block">
            <Card className="border-border hover:border-primary/40 transition-all hover:shadow-md h-full">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                    <Users className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Volunteers</p>
                    <p className="text-sm text-muted-foreground">View roster and schedules</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/emails" className="group block">
            <Card className="border-border hover:border-primary/40 transition-all hover:shadow-md h-full">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                    <Mail className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Emails</p>
                    <p className="text-sm text-muted-foreground">Send to opted-in volunteers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/reports" className="group block">
            <Card className="border-border hover:border-primary/40 transition-all hover:shadow-md h-full">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                    <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Reports</p>
                    <p className="text-sm text-muted-foreground">Analytics and activity</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Metrics - moved to bottom, compact row */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Quick Stats</h3>
          <div className="grid gap-4 grid-cols-3">
            <Card className="border-border/60 bg-muted/30">
              <CardContent className="p-4 flex items-center gap-4">
                <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-2xl font-bold tracking-tight">{stats.volunteers}</p>
                  <p className="text-xs text-muted-foreground">Volunteers</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-muted/30">
              <CardContent className="p-4 flex items-center gap-4">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-2xl font-bold tracking-tight">{stats.shifts}</p>
                  <p className="text-xs text-muted-foreground">Total Shifts</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-muted/30">
              <CardContent className="p-4 flex items-center gap-4">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-2xl font-bold tracking-tight">{stats.assignments}</p>
                  <p className="text-xs text-muted-foreground">Assignments</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RequireAuth>
  )
}
