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
import { Search, Download } from 'lucide-react'

type Volunteer = {
  id: string
  name: string | null
  phone: string | null
  role: string | null
  created_at: string
  active: boolean | null
}

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("active")

  useEffect(() => {
    loadVolunteers()
  }, [statusFilter])

  async function loadVolunteers() {
    setLoading(true)
    let query = supabase.from("profiles").select("*").order("name", { ascending: true })

    if (statusFilter === "active") {
      query = query.or("active.is.null,active.eq.true")
    } else if (statusFilter === "inactive") {
      query = query.eq("active", false)
    }

    const { data, error } = await query

    if (!error && data) {
      setVolunteers(data as Volunteer[])
    }
    setLoading(false)
  }

  const filtered = volunteers.filter((v) => {
    const q = search.toLowerCase()
    return (
      (v.name || "").toLowerCase().includes(q) ||
      (v.phone || "").toLowerCase().includes(q) ||
      v.id.toLowerCase().includes(q)
    )
  })

  function exportToCSV() {
    const headers = ["Name", "Phone", "Role", "Status", "Joined"]
    const rows = filtered.map((v: Volunteer) => [
      v.name || "Unnamed",
      v.phone || "",
      v.role || "volunteer",
      v.active === false ? "Inactive" : "Active",
      new Date(v.created_at).toLocaleDateString(),
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
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
                  placeholder="Search by name, phone, or ID..."
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
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((v: Volunteer) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name || "Unnamed"}</TableCell>
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
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/volunteers/${v.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
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
