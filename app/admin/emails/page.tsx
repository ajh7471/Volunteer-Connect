"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import RequireAuth from "@/app/components/RequireAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/lib/toast"
import { Mail, Send, Users } from 'lucide-react'

type EmailLog = {
  id: string
  sent_at: string
  recipient_email: string
  email_type: string
  subject: string
  status: string
}

type Volunteer = {
  id: string
  name: string
  email: string
  email_opt_in: boolean
  email_categories: Record<string, boolean> | null
}

type Profile = {
  id: string
  name: string
  email_opt_in: boolean
  email_categories: Record<string, boolean> | null
  email?: string
}

export default function AdminEmailsPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [emailType, setEmailType] = useState("reminder")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")

  useEffect(() => {
    loadVolunteers()
    loadEmailLogs()
  }, [])

  async function loadVolunteers() {
    // Get volunteers who opted in for emails
    const { data: profiles } = await supabase.from("profiles").select("*").eq("email_opt_in", true).order("name")

    if (profiles) {
      const enrichedVolunteers: Volunteer[] = await Promise.all(
        profiles.map(async (profile: Profile) => {
          const { data } = await supabase.auth.admin.getUserById(profile.id)
          return {
            ...profile,
            email: data.user?.email || profile.email || "",
          }
        }),
      )
      setVolunteers(enrichedVolunteers)
    }
  }

  async function loadEmailLogs() {
    const { data } = await supabase.from("email_logs").select("*").order("sent_at", { ascending: false }).limit(50)

    if (data) {
      setEmailLogs(data as EmailLog[])
    }
  }

  function getFilteredVolunteers() {
    if (filterCategory === "all") return volunteers

    return volunteers.filter((v: Volunteer) => {
      const categories = v.email_categories || {}

      switch (filterCategory) {
        case "reminders":
          return categories.reminders === true
        case "confirmations":
          return categories.confirmations === true
        case "promotional":
          return categories.promotional === true
        case "urgent":
          return categories.urgent === true
        default:
          return true
      }
    })
  }

  function handleToggleRecipient(userId: string) {
    setSelectedRecipients((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  function handleSelectAll() {
    const filtered = getFilteredVolunteers()
    setSelectedRecipients(filtered.map((v) => v.id))
  }

  function handleDeselectAll() {
    setSelectedRecipients([])
  }

  async function handleSendEmail() {
    if (selectedRecipients.length === 0) {
      toast.error("Please select at least one recipient")
      return
    }

    if (!subject || !message) {
      toast.error("Please fill in subject and message")
      return
    }

    try {
      const { data: authUser } = await supabase.auth.getUser()

      // Log email for each recipient
      const emailPromises: Promise<any>[] = selectedRecipients.map(async (recipientId: string) => {
        const volunteer = volunteers.find((v: Volunteer) => v.id === recipientId)

        return supabase.from("email_logs").insert({
          sent_by: authUser.user?.id,
          recipient_id: recipientId,
          recipient_email: volunteer?.email || "",
          email_type: emailType,
          subject,
          status: "pending", // In production, this would call an email service
        })
      })

      await Promise.all(emailPromises)

      toast.success(`Email queued for ${selectedRecipients.length} recipient(s)`)
      setShowComposeModal(false)
      setSelectedRecipients([])
      setSubject("")
      setMessage("")
      loadEmailLogs()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send emails"
      toast.error(errorMessage)
    }
  }

  const filteredVolunteers = getFilteredVolunteers()

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Communications</h1>
            <p className="text-muted-foreground">Send emails to volunteers who opted in</p>
          </div>
          <Button onClick={() => setShowComposeModal(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Compose Email
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opted-In Volunteers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{volunteers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{emailLogs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">From Address</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-mono">volunteer@vanderpumpdogs.org</div>
            </CardContent>
          </Card>
        </div>

        {/* Email History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Emails</CardTitle>
            <CardDescription>Last 50 emails sent to volunteers</CardDescription>
          </CardHeader>
          <CardContent>
            {emailLogs.length === 0 ? (
              <p className="text-center text-muted-foreground">No emails sent yet</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.sent_at).toLocaleString()}</TableCell>
                        <TableCell className="font-mono text-xs">{log.recipient_email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.email_type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === "sent" ? "default" : "secondary"}>{log.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compose Email Modal */}
        <Dialog open={showComposeModal} onOpenChange={setShowComposeModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Compose Email</DialogTitle>
              <DialogDescription>Send email to volunteers from volunteer@vanderpumpdogs.org</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-type">Email Type</Label>
                <Select value={emailType} onValueChange={setEmailType}>
                  <SelectTrigger id="email-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reminder">Shift Reminder</SelectItem>
                    <SelectItem value="confirmation">Booking Confirmation</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="urgent">Urgent Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject line"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Email message content"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Recipients ({selectedRecipients.length} selected)</Label>
                  <div className="flex gap-2">
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Opted-In</SelectItem>
                        <SelectItem value="reminders">Reminders Only</SelectItem>
                        <SelectItem value="confirmations">Confirmations Only</SelectItem>
                        <SelectItem value="promotional">Promotional Only</SelectItem>
                        <SelectItem value="urgent">Urgent Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                      Deselect All
                    </Button>
                  </div>
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                  {filteredVolunteers.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">No volunteers match this category</p>
                  ) : (
                    filteredVolunteers.map((volunteer) => (
                      <div key={volunteer.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={volunteer.id}
                          checked={selectedRecipients.includes(volunteer.id)}
                          onCheckedChange={() => handleToggleRecipient(volunteer.id)}
                        />
                        <Label htmlFor={volunteer.id} className="cursor-pointer text-sm font-normal">
                          {volunteer.name} ({volunteer.email})
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowComposeModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendEmail}>
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequireAuth>
  )
}
