"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import RequireAuth from "@/app/components/RequireAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download } from 'lucide-react'
import { getAdminUsers } from "@/app/admin/actions"

type VolunteerData = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  role: string | null
  active: boolean | null
  created_at: string
  last_sign_in_at?: string
}

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<VolunteerData[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("active")

  useEffect(() => {
    loadVolunteers()
  }, [statusFilter])

  async function loadVolunteers() {
    setLoading(true)

    try {
      const result = await getAdminUsers()
      
      if (result.success && result.users) {
        let filteredUsers = result.users
        
        // Apply status filter
        if (statusFilter === "active") {
          filteredUsers = filteredUsers.filter((u: VolunteerData) => u.active !== false)
        } else if (statusFilter === "inactive") {
          filteredUsers = filteredUsers.filter((u: VolunteerData) => u.active === false)
        }
        
        setVolunteers(filteredUsers)
        console.log("[v0] Client: Loaded volunteers:", filteredUsers.length)
        console.log("[v0] Client: Volunteer emails:", filteredUsers.map((v: VolunteerData) => v.email))
      } else {
        console.error("[v0] Client: Failed to load volunteers:", result.error)
      }
    } catch (err) {
      console.error("[v0] Client: Load volunteers error:", err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = volunteers.filter((v: VolunteerData) => {
    const q = search.toLowerCase()
    return (
      (v.name || "").toLowerCase().includes(q) ||
      (v.phone || "").toLowerCase().includes(q) ||
      (v.email || "").toLowerCase().includes(q) ||
      v.id.toLowerCase().includes(q)
    )
  })

  function exportToCSV() {
    const headers = ["Name", "Email", "Phone", "Role", "Status", "Joined", "Last Sign In"]
    const rows = filtered.map((v: VolunteerData) => [
      v.name || "Unnamed",
      v.email || "",
      v.phone || "",
      v.role || "volunteer",
      v.active === false ? "Inactive" : "Active",
      new Date(v.created_at).toLocaleDateString(),
      v.last_sign_in_at ? new Date(v.last_sign_in_at).toLocaleDateString() : "Never",
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
                      <TableHead>Joined</TableHead>
                      <TableHead>Last Sign In</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((v: VolunteerData) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name || "Unnamed"}</TableCell>
                        <TableCell>{v.email || "No email"}</TableCell>
                        <TableCell>{v.phone || "No phone"}</TableCell>
                        <TableCell>
                          <Badge variant={v.role === "admin" ? "default" : "secondary"}>{v.role || "volunteer"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={v.active === false ? "destructive" : "default"}>
                            {v.active === false ? "Inactive" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(v.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{v.last_sign_in_at ? new Date(v.last_sign_in_at).toLocaleDateString() : "Never"}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/volunteers/${v.id}`}>View</Link>
                          </Button>
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
