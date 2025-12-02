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
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionError || !sessionData.session) {
          adminCheckCompleted.current = true
          setIsAdmin(false)
          clearTimeout(loadTimeout)
          return
        }

        const uid = sessionData.session.user.id

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
          <CardContent className="flex gap-2">
            <Button onClick={() => router.push("/calendar")}>Go to Calendar</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                sessionStorage.clear()
                localStorage.clear()
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volunteers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.volunteers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.shifts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assignments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.assignments}</div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <UserCog className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>User Management</CardTitle>
              <CardDescription>Create users, manage roles, and block emails</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/admin/users">Manage Users</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <Users className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Manage Volunteers</CardTitle>
              <CardDescription>View, edit, and manage volunteer accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/admin/volunteers">View Volunteers</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <Calendar className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Manage Shifts</CardTitle>
              <CardDescription>Create shifts and assign volunteers to slots</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/admin/shifts">Manage Shifts</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <Mail className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Email Communications</CardTitle>
              <CardDescription>Send emails to opted-in volunteers</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/admin/emails">Manage Emails</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <FileText className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>View Reports</CardTitle>
              <CardDescription>Analytics and volunteer activity reports</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/admin/reports">View Reports</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <Settings className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Settings</CardTitle>
              <CardDescription>Configure system settings and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/admin/settings">Settings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </RequireAuth>
  )
}
