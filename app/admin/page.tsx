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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage volunteers and shifts</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Volunteers</CardTitle>
              <Users className="h-5 w-5 text-primary/60" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stats.volunteers}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
            </CardContent>
          </Card>
          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Shifts</CardTitle>
              <Calendar className="h-5 w-5 text-primary/60" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stats.shifts}</div>
              <p className="text-xs text-muted-foreground mt-1">Available opportunities</p>
            </CardContent>
          </Card>
          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Assignments</CardTitle>
              <FileText className="h-5 w-5 text-primary/60" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stats.assignments}</div>
              <p className="text-xs text-muted-foreground mt-1">Total commitments</p>
            </CardContent>
          </Card>
        </div>

        {/* Primary actions */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/admin/shifts" className="group block">
            <Card className="border-primary/20 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 h-full">
              <CardContent className="flex items-center gap-5 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Shift Management</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Week view, bulk create/delete, assign volunteers
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/volunteers" className="group block">
            <Card className="border-primary/20 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 h-full">
              <CardContent className="flex items-center gap-5 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Volunteers</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    View rosters, manage schedules by volunteer
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Secondary actions */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: "/admin/users", icon: UserCog, label: "User Management", desc: "Roles, accounts, blocklist" },
            { href: "/admin/emails", icon: Mail, label: "Emails", desc: "Send to opted-in volunteers" },
            { href: "/admin/reports", icon: FileText, label: "Reports", desc: "Analytics and activity" },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href} className="group block">
              <Card className="border-border hover:border-primary/30 transition-all h-full">
                <CardContent className="flex items-center gap-4 p-4">
                  <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </RequireAuth>
  )
}
