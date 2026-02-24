"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Laptop, Smartphone, Tablet, Globe, Clock, LogOut, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"

interface Session {
  id: string
  device_type: "desktop" | "mobile" | "tablet"
  browser_name: string
  os_name: string
  ip_address: string
  last_activity_at: string
  created_at: string
  is_active: boolean
  isCurrent: boolean
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/session/list")
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions)
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId)
    try {
      const response = await fetch("/api/session/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, reason: "user_revoked" }),
      })

      if (response.ok) {
        setSessions(sessions.filter((s) => s.id !== sessionId))
        toast({
          title: "Session revoked",
          description: "The session has been terminated.",
        })
      } else {
        throw new Error("Failed to revoke session")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke session. Please try again.",
        variant: "destructive",
      })
    } finally {
      setRevoking(null)
    }
  }

  const revokeAllOtherSessions = async () => {
    try {
      const response = await fetch("/api/session/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revokeAll: true, reason: "user_revoked_all" }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Sessions revoked",
          description: `${data.revokedCount} session(s) have been terminated.`,
        })
        fetchSessions()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke sessions. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "mobile":
        return <Smartphone className="h-5 w-5" />
      case "tablet":
        return <Tablet className="h-5 w-5" />
      default:
        return <Laptop className="h-5 w-5" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage your active login sessions across devices</CardDescription>
        </div>
        {sessions.length > 1 && (
          <Button variant="outline" size="sm" onClick={revokeAllOtherSessions}>
            Sign Out All Other Sessions
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No active sessions found.</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-muted p-2">{getDeviceIcon(session.device_type)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {session.browser_name} on {session.os_name}
                      </span>
                      {session.isCurrent && <Badge variant="secondary">Current</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {session.ip_address}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Active {formatDistanceToNow(new Date(session.last_activity_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeSession(session.id)}
                    disabled={revoking === session.id}
                  >
                    {revoking === session.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
