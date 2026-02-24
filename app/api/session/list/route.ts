import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    let supabase: Awaited<ReturnType<typeof createClient>>
    try {
      supabase = await createClient()
    } catch {
      return NextResponse.json({ sessions: [], count: 0, degraded: true })
    }

    let user: { id: string } | null = null
    try {
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError || !data.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      user = data.user
    } catch {
      return NextResponse.json({ sessions: [], count: 0, degraded: true })
    }

    // Get user ID from query params (admins can view other users)
    const searchParams = request.nextUrl.searchParams
    const targetUserId = searchParams.get("userId") || user.id

    // Check permissions
    if (targetUserId !== user.id) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()

      if (profile?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Get active sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("user_sessions")
      .select("id, device_type, browser_name, os_name, ip_address, last_activity_at, created_at, is_active")
      .eq("user_id", targetUserId)
      .eq("is_active", true)
      .order("last_activity_at", { ascending: false })

    if (sessionsError) {
      // Table doesn't exist - return empty list gracefully
      if (sessionsError.code === "PGRST205" || sessionsError.code === "42P01") {
        return NextResponse.json({ sessions: [], count: 0, tableNotFound: true })
      }
      console.error("[Session API] Failed to fetch sessions:", sessionsError)
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
    }

    // Get current session token to mark which is current
    const currentToken = request.headers.get("x-session-token")

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        ...s,
        // Don't expose full token, just indicate if current
        isCurrent: false, // Would need token comparison on server
      })),
      count: sessions.length,
    })
  } catch {
    return NextResponse.json({ sessions: [], count: 0, degraded: true })
  }
}
