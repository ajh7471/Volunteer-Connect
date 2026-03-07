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
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/lib/toast"
import { Mail, Send, Users } from "lucide-react"

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

type EmailInsertResult = {
  error: any
  data: any
  count: number | null
  status: number
  statusText: string
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
      const { data: sessionData } = await supabase.auth.getSession()

      const emailPromises: Promise<EmailInsertResult>[] = selectedRecipients.map(async (recipientId: string) => {
        const volunteer = volunteers.find((v: Volunteer) => v.id === recipientId)

        return supabase.from("email_logs").insert({
          sent_by: sessionData.session?.user?.id,
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
    } catch (error: unknown) {
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
            <h1 className="text-2xl font-bold tracking-tight">Email Communications</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Send emails to volunteers who opted in</p>
          </div>
          <Button onClick={() => setShowComposeModal(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Compose Email
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Users, label: "Opted-In", value: volunteers.length },
            { icon: Send,  label: "Emails Sent", value: emailLogs.length },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 flex items-center gap-3">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-lg font-bold leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-mono text-foreground leading-snug">volunteer@vanderpumpdogs.org</p>
              <p className="text-xs text-muted-foreground mt-0.5">From address</p>
            </div>
          </div>
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

        {/* Compose Email Dialog */}
        <Dialog open={showComposeModal} onOpenChange={setShowComposeModal}>
          <DialogContent className="sm:max-w-lg p-0 gap-0">
            <DialogHeader className="px-5 pt-5 pb-4 border-b">
              <DialogTitle className="text-base font-semibold">Compose Email</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Send from volunteer@vanderpumpdogs.org
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[72vh]">
              <div className="px-5 py-4 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email Type</Label>
                  <Select value={emailType} onValueChange={setEmailType}>
                    <SelectTrigger className="h-9 text-sm">
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

                <div className="space-y-1.5">
                  <Label className="text-xs">Subject</Label>
                  <Input
                    className="h-9 text-sm"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject line"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Message</Label>
                  <Textarea
                    className="text-sm resize-none"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Email message content"
                    rows={5}
                  />
                </div>

                {/* Recipients */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">
                      Recipients{" "}
                      <span className="text-muted-foreground">({selectedRecipients.length} selected)</span>
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="h-7 text-xs w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Opted-In</SelectItem>
                          <SelectItem value="reminders">Reminders</SelectItem>
                          <SelectItem value="confirmations">Confirmations</SelectItem>
                          <SelectItem value="promotional">Promotional</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={handleSelectAll}>
                        All
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={handleDeselectAll}>
                        None
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border bg-muted/20 p-3">
                    {filteredVolunteers.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-2">No volunteers match this category</p>
                    ) : (
                      filteredVolunteers.map((volunteer) => (
                        <div key={volunteer.id} className="flex items-center gap-2">
                          <Checkbox
                            id={volunteer.id}
                            checked={selectedRecipients.includes(volunteer.id)}
                            onCheckedChange={() => handleToggleRecipient(volunteer.id)}
                          />
                          <Label htmlFor={volunteer.id} className="cursor-pointer text-xs font-normal leading-snug">
                            {volunteer.name}
                            <span className="text-muted-foreground ml-1">({volunteer.email})</span>
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="px-5 py-3 border-t flex gap-2">
              <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => setShowComposeModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1 h-9 text-sm" onClick={handleSendEmail}>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Send Email
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RequireAuth>
  )
}
