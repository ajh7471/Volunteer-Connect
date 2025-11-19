"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import RequireAuth from "@/app/components/RequireAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, AlertCircle, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"

type Volunteer = {
  id: string
  name: string | null
  phone: string | null
  role: string | null
  email: string | null
  created_at: string
  active: boolean | null
  has_profile: boolean
  auth_email?: string
}

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("active")
  const [missingProfiles, setMissingProfiles] = useState<number>(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadVolunteers()
  }, [statusFilter])

  async function loadVolunteers() {
    setLoading(true)
    
    try {
      // Fetch all profiles
      let profileQuery = supabase.from("profiles").select("*").order("name", { ascending: true })

      if (statusFilter === "active") {
        profileQuery = profileQuery.or("active.is.null,active.eq.true")
      } else if (statusFilter === "inactive") {
        profileQuery = profileQuery.eq("active", false)
      }

      const { data: profilesData, error: profilesError } = await profileQuery

      if (profilesError) {
        console.error("[v0] Profiles fetch error:", profilesError)
      }

      // Fetch all auth users to compare
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

      if (authError) {
        console.error("[v0] Auth users fetch error:", authError)
      }

      console.log("[v0] Profiles count:", profilesData?.length || 0)
      console.log("[v0] Auth users count:", authData?.users?.length || 0)

      // Create a map of profiles by user ID
      const profilesMap = new Map((profilesData || []).map((p: Volunteer) => [p.id, p]))

      // Merge auth users with profiles
      const allUsers: Volunteer[] = []
      let missingProfileCount = 0

      if (authData?.users) {
        for (const authUser of authData.users) {
          const profile = profilesMap.get(authUser.id)
          
          if (profile) {
            // User has a profile
            allUsers.push({
              ...profile,
              has_profile: true,
              auth_email: authUser.email
            })
            profilesMap.delete(authUser.id) // Remove from map so we don't duplicate
          } else {
            // User exists in auth but has no profile
            missingProfileCount++
            allUsers.push({
              id: authUser.id,
              name: authUser.user_metadata?.name || null,
              phone: authUser.user_metadata?.phone || null,
              role: 'volunteer',
              email: authUser.email || null,
              created_at: authUser.created_at,
              active: true,
              has_profile: false,
              auth_email: authUser.email
            })
          }
        }
      }

      // Add any remaining profiles that don't have auth users (shouldn't happen but handle it)
      profilesMap.forEach((profile) => {
        allUsers.push({
          ...profile,
          has_profile: true
        })
      })

      console.log("[v0] Missing profiles:", missingProfileCount)
      console.log("[v0] Total users:", allUsers.length)

      setMissingProfiles(missingProfileCount)
      setVolunteers(allUsers)
    } catch (err) {
      console.error("[v0] Load volunteers error:", err)
    } finally {
      setLoading(false)
    }
  }

  async function syncMissingProfiles() {
    setSyncing(true)
    
    try {
      // Fetch all auth users
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
      
      if (authError) throw authError
      
      if (!authData?.users) {
        throw new Error("No auth users found")
      }

      // Fetch existing profiles
      const { data: existingProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id")
      
      if (profilesError) throw profilesError

      const existingProfileIds = new Set((existingProfiles || []).map((p: { id: string }) => p.id))

      // Find users without profiles
      const usersWithoutProfiles = authData.users.filter(
        (user) => !existingProfileIds.has(user.id)
      )

      console.log("[v0] Users without profiles:", usersWithoutProfiles.length)

      if (usersWithoutProfiles.length === 0) {
        alert("All users already have profiles!")
        return
      }

      // Create profiles for users without them
      const newProfiles = usersWithoutProfiles.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
        phone: user.user_metadata?.phone || null,
        role: 'volunteer',
        active: true,
        email_opt_in: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error: insertError } = await supabase
        .from("profiles")
        .insert(newProfiles)

      if (insertError) throw insertError

      alert(`Successfully created ${newProfiles.length} missing profile(s)!`)
      
      // Reload volunteers
      await loadVolunteers()
    } catch (err) {
      console.error("[v0] Sync error:", err)
      alert(`Failed to sync profiles: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSyncing(false)
    }
  }

  const filtered = volunteers.filter((v: Volunteer) => {
    const q = search.toLowerCase()
    return (
      (v.name || "").toLowerCase().includes(q) ||
      (v.phone || "").toLowerCase().includes(q) ||
      (v.email || "").toLowerCase().includes(q) ||
      v.id.toLowerCase().includes(q)
    )
  })

  function exportToCSV() {
    const headers = ["Name", "Email", "Phone", "Role", "Status", "Has Profile", "Joined"]
    const rows = filtered.map((v: Volunteer) => [
      v.name || "Unnamed",
      v.email || v.auth_email || "",
      v.phone || "",
      v.role || "volunteer",
      v.active === false ? "Inactive" : "Active",
      v.has_profile ? "Yes" : "No",
      new Date(v.created_at).toLocaleDateString(),
    ])

    const csv = [headers, ...rows].map((row: (string | number)[]) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `volunteers_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Volunteers</h1>
            <p className="text-muted-foreground">View and manage all volunteer accounts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV} disabled={filtered.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button asChild>
              <Link href="/admin">Back to Dashboard</Link>
            </Button>
          </div>
        </div>

        {missingProfiles > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Found {missingProfiles} user(s) without profiles. These users exist in authentication but don't have complete profile records.
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={syncMissingProfiles}
                disabled={syncing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Profiles'}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Volunteer Directory</CardTitle>
            <CardDescription>Search and manage volunteer profiles ({filtered.length} total)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Volunteers</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <p className="text-center text-muted-foreground">Loading volunteers...</p>
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
                      <TableHead>Profile</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((v: Volunteer) => (
                      <TableRow key={v.id} className={!v.has_profile ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}>
                        <TableCell className="font-medium">{v.name || "Unnamed"}</TableCell>
                        <TableCell>{v.email || v.auth_email || "No email"}</TableCell>
                        <TableCell>{v.phone || "No phone"}</TableCell>
                        <TableCell>
                          <Badge variant={v.role === "admin" ? "default" : "secondary"}>{v.role || "volunteer"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={v.active === false ? "destructive" : "default"}>
                            {v.active === false ? "Inactive" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={v.has_profile ? "default" : "destructive"}>
                            {v.has_profile ? "Complete" : "Missing"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(v.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          {v.has_profile ? (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/admin/volunteers/${v.id}`}>View</Link>
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled>
                              No Profile
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No volunteers found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  )
}
