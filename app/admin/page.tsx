"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import RequireAuth from "@/app/components/RequireAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, FileText, Settings } from "lucide-react"

export default function AdminDashboard() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [stats, setStats] = useState({ volunteers: 0, shifts: 0, assignments: 0 })

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id
      if (!uid) {
        setIsAdmin(false)
        return
      }

      const { data } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle()

      if (data?.role === "admin") {
        setIsAdmin(true)
        // Load stats
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
      } else {
        setIsAdmin(false)
      }
    })()
  }, [])

  if (isAdmin === false) {
    return (
      <RequireAuth>
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/calendar")}>Go to Calendar</Button>
          </CardContent>
        </Card>
      </RequireAuth>
    )
  }

  if (isAdmin === null) {
    return (
      <RequireAuth>
        <div className="text-center">
          <p className="text-muted-foreground">Checking permissions...</p>
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
        <div className="grid gap-4 sm:grid-cols-2">
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
