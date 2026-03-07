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
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage volunteers and shifts</p>
        </div>

        {/* Primary actions */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/admin/shifts" className="group block">
            <Card className="border-border hover:border-primary/50 transition-all hover:shadow-md h-full">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors mt-0.5">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">Shift Management</p>
                    <p className="text-sm text-muted-foreground leading-snug mt-0.5">
                      Create shifts, assign volunteers, set recurring schedules
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users" className="group block">
            <Card className="border-border hover:border-primary/50 transition-all hover:shadow-md h-full">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors mt-0.5">
                    <UserCog className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">User Management</p>
                    <p className="text-sm text-muted-foreground leading-snug mt-0.5">
                      Accounts, roles, permissions, and blocklist
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Secondary actions */}
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { href: "/admin/volunteers", icon: Users, label: "Volunteers", desc: "Roster and schedules" },
            { href: "/admin/emails",     icon: Mail,    label: "Emails",     desc: "Send to volunteers" },
            { href: "/admin/reports",    icon: FileText, label: "Reports",   desc: "Analytics and exports" },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href} className="group block">
              <Card className="border-border hover:border-primary/40 transition-all hover:shadow-sm h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 flex items-center gap-3">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-lg font-bold leading-none">{stats.volunteers}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Volunteers</p>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-lg font-bold leading-none">{stats.shifts}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Shifts</p>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-lg font-bold leading-none">{stats.assignments}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Assignments</p>
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  )
}
