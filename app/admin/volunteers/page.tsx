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
import { Search } from "lucide-react"

type Volunteer = {
  id: string
  name: string | null
  phone: string | null
  role: string | null
  created_at: string
}

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVolunteers()
  }, [])

  async function loadVolunteers() {
    setLoading(true)
    const { data, error } = await supabase.from("profiles").select("*").order("name", { ascending: true })

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

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Volunteers</h1>
            <p className="text-muted-foreground">View and manage all volunteer accounts</p>
          </div>
          <Button asChild>
            <Link href="/admin">Back to Dashboard</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Volunteer Directory</CardTitle>
            <CardDescription>Search and manage volunteer profiles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
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
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name || "Unnamed"}</TableCell>
                        <TableCell>{v.phone || "No phone"}</TableCell>
                        <TableCell>
                          <Badge variant={v.role === "admin" ? "default" : "secondary"}>{v.role || "volunteer"}</Badge>
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
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
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
