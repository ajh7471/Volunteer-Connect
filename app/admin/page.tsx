"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import RequireAuth from "@/app/components/RequireAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users, Calendar, FileText, UserCog, Mail,
  UserPlus, AlertCircle, ClipboardList, Clock,
  TrendingUp, Inbox, CheckCircle2, XCircle,
} from "lucide-react"
import { useSessionRole } from "@/lib/useSession"
import { getDashboardMetrics, type DashboardMetrics } from "./reporting-actions"
import { cn } from "@/lib/utils"

export default function AdminDashboard() {
  const router = useRouter()
  const { role, loading: roleLoading } = useSessionRole()
  const isAdmin = roleLoading ? null : role === "admin"
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAdmin === true) loadMetrics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const loadMetrics = async () => {
    setLoading(true)
    const res = await getDashboardMetrics()
    if (res.success && res.data) setMetrics(res.data)
    setLoading(false)
  }

  if (isAdmin === false) {
    return (
      <RequireAuth>
        <Card className="mx-auto mt-8 max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access this page.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button className="min-h-[44px]" onClick={() => router.push("/calendar")}>Go to Calendar</Button>
            <Button className="min-h-[44px]" variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/" }}>
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
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Checking permissions...</p>
          </div>
        </div>
      </RequireAuth>
    )
  }

  const m = metrics

  return (
    <RequireAuth>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage volunteers and shifts</p>
          </div>
          {(m?.openCoverageRequests ?? 0) > 0 && (
            <Badge variant="destructive" className="gap-1.5">
              <AlertCircle className="h-3 w-3" />
              {m!.openCoverageRequests} coverage {m!.openCoverageRequests === 1 ? "request" : "requests"}
            </Badge>
          )}
        </div>

        {/* Primary nav cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/admin/shifts" className="group block">
            <Card className="border-border hover:border-primary/50 transition-all hover:shadow-md h-full">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors mt-0.5">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">Shift Management</p>
                    <p className="text-sm text-muted-foreground leading-snug mt-0.5">
                      Create shifts, assign volunteers, set recurring schedules
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users" className="group block">
            <Card className="border-border hover:border-primary/50 transition-all hover:shadow-md h-full">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors mt-0.5">
                    <UserCog className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">User Management</p>
                    <p className="text-sm text-muted-foreground leading-snug mt-0.5">
                      Accounts, roles, permissions, and blocklist
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Secondary nav */}
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { href: "/admin/volunteers", icon: Users,    label: "Volunteers", desc: "Roster and schedules" },
            { href: "/admin/emails",     icon: Mail,     label: "Emails",     desc: "Send to volunteers" },
            { href: "/admin/reports",    icon: FileText, label: "Reports",    desc: "Analytics and exports" },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href} className="group block">
              <Card className="border-border hover:border-primary/40 transition-all hover:shadow-sm h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* ── TODAY ── */}
        <Section title="Today" icon={Clock}>
          <MetricRow>
            <Metric
              loading={loading}
              label="Shifts Today"
              value={m?.shiftsToday ?? 0}
              sub={m ? `${m.shiftsTodayFilled} / ${m.shiftsTodayCapacity} spots filled` : undefined}
              icon={Calendar}
              accent={m && m.shiftsTodayFilled < m.shiftsTodayCapacity ? "warn" : "ok"}
            />
            <Metric
              loading={loading}
              label="Open Spots (Today)"
              value={m ? Math.max(0, m.shiftsTodayCapacity - m.shiftsTodayFilled) : 0}
              sub="unfilled slots today"
              icon={AlertCircle}
              accent={m && (m.shiftsTodayCapacity - m.shiftsTodayFilled) > 0 ? "warn" : "ok"}
            />
            <Metric
              loading={loading}
              label="Coverage Requests"
              value={m?.openCoverageRequests ?? 0}
              sub="open emergency requests"
              icon={AlertCircle}
              accent={m && m.openCoverageRequests > 0 ? "danger" : "neutral"}
              href="/admin/shifts"
            />
          </MetricRow>
        </Section>

        {/* ── UPCOMING ── */}
        <Section title="Next 7 Days" icon={Calendar}>
          <MetricRow>
            <Metric
              loading={loading}
              label="Upcoming Shifts"
              value={m?.upcomingShifts ?? 0}
              sub="shifts in next 7 days"
              icon={Calendar}
            />
            <Metric
              loading={loading}
              label="Open Spots"
              value={m?.openSpotsNext7 ?? 0}
              sub="unfilled volunteer spots"
              icon={ClipboardList}
              accent={m && m.openSpotsNext7 > 5 ? "warn" : "neutral"}
            />
            <Metric
              loading={loading}
              label="Fully Booked"
              value={m?.fullyBookedNext7 ?? 0}
              sub={m ? `of ${m.upcomingShifts} upcoming shifts` : undefined}
              icon={CheckCircle2}
              accent="ok"
            />
            <Metric
              loading={loading}
              label="Waitlist"
              value={m?.waitlistPending ?? 0}
              sub="volunteers waiting"
              icon={Inbox}
              accent={m && m.waitlistPending > 0 ? "warn" : "neutral"}
              href="/admin/shifts"
            />
          </MetricRow>
        </Section>

        {/* ── VOLUNTEERS ── */}
        <Section title="Volunteers" icon={Users}>
          <MetricRow>
            <Metric
              loading={loading}
              label="Total Volunteers"
              value={m?.totalVolunteers ?? 0}
              sub="registered accounts"
              icon={Users}
              href="/admin/volunteers"
            />
            <Metric
              loading={loading}
              label="New This Week"
              value={m?.newVolunteersThisWeek ?? 0}
              sub="joined in last 7 days"
              icon={UserPlus}
              accent={m && m.newVolunteersThisWeek > 0 ? "ok" : "neutral"}
            />
            <Metric
              loading={loading}
              label="Active This Month"
              value={m?.activeThisMonth ?? 0}
              sub="assignments this month"
              icon={TrendingUp}
            />
            <Metric
              loading={loading}
              label="Email Opt-ins"
              value={m?.emailOptIns ?? 0}
              sub={m ? `${Math.round((m.emailOptIns / Math.max(m.totalVolunteers, 1)) * 100)}% of volunteers` : undefined}
              icon={Mail}
              href="/admin/emails"
            />
          </MetricRow>
        </Section>

        {/* ── EMAILS ── */}
        <Section title="Emails — Last 30 Days" icon={Mail}>
          <MetricRow>
            <Metric
              loading={loading}
              label="Sent"
              value={m?.emailsSent30d ?? 0}
              sub="successfully delivered"
              icon={CheckCircle2}
              accent="ok"
              href="/admin/emails"
            />
            <Metric
              loading={loading}
              label="Failed"
              value={m?.emailsFailed30d ?? 0}
              sub="delivery failures"
              icon={XCircle}
              accent={m && m.emailsFailed30d > 0 ? "danger" : "neutral"}
              href="/admin/emails"
            />
            <Metric
              loading={loading}
              label="Total Assignments"
              value={m?.totalAssignments ?? 0}
              sub="all-time sign-ups"
              icon={ClipboardList}
            />
          </MetricRow>
        </Section>

      </div>
    </RequireAuth>
  )
}

// ── Sub-components ──────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      </div>
      {children}
    </div>
  )
}

function MetricRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {children}
    </div>
  )
}

type Accent = "ok" | "warn" | "danger" | "neutral"

function Metric({
  label,
  value,
  sub,
  icon: Icon,
  accent = "neutral",
  loading,
  href,
}: {
  label: string
  value: number
  sub?: string
  icon: React.ElementType
  accent?: Accent
  loading?: boolean
  href?: string
}) {
  const accentColor: Record<Accent, string> = {
    ok:      "text-green-600 dark:text-green-400",
    warn:    "text-amber-600 dark:text-amber-400",
    danger:  "text-destructive",
    neutral: "text-muted-foreground",
  }

  const inner = (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-muted/20 px-4 py-3 flex flex-col gap-1",
        href && "hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer",
        loading && "animate-pulse"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground leading-none">{label}</p>
        <Icon className={cn("h-3.5 w-3.5 shrink-0", accentColor[accent])} />
      </div>
      <p className={cn("text-xl font-bold leading-none tabular-nums", accentColor[accent])}>
        {loading ? "—" : value.toLocaleString()}
      </p>
      {sub && <p className="text-xs text-muted-foreground leading-tight">{sub}</p>}
    </div>
  )

  return href ? <Link href={href}>{inner}</Link> : inner
}
