"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import RequireAuth from "@/app/components/RequireAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, FileText, Settings, UserCog, Mail } from "lucide-react"

export default function AdminDashboard() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [stats, setStats] = useState({ volunteers: 0, shifts: 0, assignments: 0 })
  const [error, setError] = useState<string | null>(null)
  const adminCheckCompleted = useRef(false)

  useEffect(() => {
    let mounted = true

    const loadTimeout = setTimeout(() => {
      if (mounted && !adminCheckCompleted.current) {
        console.warn("[v0] Admin check timeout - check did not complete")
        setError("Session timeout. Please try refreshing the page.")
        setIsAdmin(false)
      }
    }, 3000)

    const checkAdmin = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionError || !session?.user) {
          adminCheckCompleted.current = true
          setIsAdmin(false)
          clearTimeout(loadTimeout)
          return
        }

        const uid = session.user.id

        const { data, error: profileError } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle()

        if (!mounted) return

        adminCheckCompleted.current = true
        clearTimeout(loadTimeout)

        if (profileError) {
          console.error("[v0] Profile fetch error:", profileError)
          setError("Unable to verify permissions. Please try again.")
          setIsAdmin(false)
          return
        }

        if (data?.role === "admin") {
          setIsAdmin(true)
          loadStats()
        } else {
          setIsAdmin(false)
        }
      } catch (error) {
        console.error("[v0] Admin dashboard error:", error)
        if (mounted) {
          adminCheckCompleted.current = true
          setError("An error occurred. Please try refreshing the page.")
          setIsAdmin(false)
        }
        clearTimeout(loadTimeout)
      }
    }

    const loadStats = async () => {
      try {
        const [volData, shiftData, assignData] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("shifts").select("id", { count: "exact", head: true }),
          supabase.from("shift_assignments").select("id", { count: "exact", head: true }),
        ])
        if (mounted) {
          setStats({
            volunteers: volData.count || 0,
            shifts: shiftData.count || 0,
            assignments: assignData.count || 0,
          })
        }
      } catch (e) {
        console.error("[v0] Stats load error:", e)
      }
    }

    checkAdmin()

    return () => {
      mounted = false
      clearTimeout(loadTimeout)
    }
  }, [])

  if (isAdmin === false) {
    return (
      <RequireAuth>
        <Card className="mx-auto mt-8 max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>{error || "You need admin privileges to access this page."}</CardDescription>
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

        {/* Admin Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-primary/10 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5">
            <CardHeader>
              <UserCog className="mb-3 h-9 w-9 text-primary/80" />
              <CardTitle className="text-lg">User Management</CardTitle>
              <CardDescription className="text-sm">Create users, manage roles, and block emails</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full min-h-[44px] font-medium">
                <Link href="/admin/users">Manage Users</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/10 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5">
            <CardHeader>
              <Users className="mb-3 h-9 w-9 text-primary/80" />
              <CardTitle className="text-lg">Manage Volunteers</CardTitle>
              <CardDescription className="text-sm">View, edit, and manage volunteer accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full min-h-[44px] font-medium">
                <Link href="/admin/volunteers">View Volunteers</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/10 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5">
            <CardHeader>
              <Calendar className="mb-3 h-9 w-9 text-primary/80" />
              <CardTitle className="text-lg">Manage Shifts</CardTitle>
              <CardDescription className="text-sm">Create shifts and assign volunteers to slots</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full min-h-[44px] font-medium">
                <Link href="/admin/shifts">Manage Shifts</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/10 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5">
            <CardHeader>
              <Mail className="mb-3 h-9 w-9 text-primary/80" />
              <CardTitle className="text-lg">Email Communications</CardTitle>
              <CardDescription className="text-sm">Send emails to opted-in volunteers</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full min-h-[44px] font-medium">
                <Link href="/admin/emails">Manage Emails</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/10 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5">
            <CardHeader>
              <FileText className="mb-3 h-9 w-9 text-primary/80" />
              <CardTitle className="text-lg">View Reports</CardTitle>
              <CardDescription className="text-sm">Analytics and volunteer activity reports</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full min-h-[44px] font-medium">
                <Link href="/admin/reports">View Reports</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/10 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5">
            <CardHeader>
              <Settings className="mb-3 h-9 w-9 text-primary/80" />
              <CardTitle className="text-lg">Settings</CardTitle>
              <CardDescription className="text-sm">Configure system settings and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full min-h-[44px] font-medium">
                <Link href="/admin/settings">Settings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </RequireAuth>
  )
}
