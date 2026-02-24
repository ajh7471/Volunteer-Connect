import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface HeartbeatRequest {
  sessionToken: string
}

export async function POST(request: NextRequest) {
  try {
    const body: HeartbeatRequest = await request.json()
    const { sessionToken } = body

    if (!sessionToken) {
      return NextResponse.json({ error: "Missing session token" }, { status: 400 })
    }

    let supabase: Awaited<ReturnType<typeof createClient>>
    try {
      supabase = await createClient()
    } catch {
      // "Load failed" creating client -- return valid so client doesn't log out
      return NextResponse.json({ valid: true, degraded: true })
    }

    // Find and validate session
    let session: { id: string; user_id: string; is_active: boolean; expires_at: string; revoked_at: string | null } | null = null
    try {
      const { data, error: sessionError } = await supabase
        .from("user_sessions")
        .select("id, user_id, is_active, expires_at, revoked_at")
        .eq("session_token", sessionToken)
        .maybeSingle()

      if (sessionError) {
        if (sessionError.code === "PGRST205" || sessionError.code === "42P01") {
          return NextResponse.json({ valid: true, tableNotFound: true })
        }
        return NextResponse.json({ valid: true, degraded: true })
      }

      session = data
    } catch {
      // "Load failed" on SELECT -- return valid so client doesn't log out
      return NextResponse.json({ valid: true, degraded: true })
    }

    if (!session) {
      // Token not registered server-side -- still valid client-side
      return NextResponse.json({ valid: true, notRegistered: true })
    }

    if (session.revoked_at) {
      return NextResponse.json({ valid: false, revoked: true, error: "Session has been revoked" })
    }

    if (!session.is_active) {
      return NextResponse.json({ valid: false, expired: true, error: "Session is not active" })
    }

    if (new Date(session.expires_at) < new Date()) {
      try {
        await supabase
          .from("user_sessions")
          .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_reason: "timeout" })
          .eq("id", session.id)
      } catch {
        // Best-effort expiration update
      }
      return NextResponse.json({ valid: false, expired: true, error: "Session has expired" })
    }

    // Update last activity (best-effort)
    try {
      await supabase
        .from("user_sessions")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", session.id)
    } catch {
      // Non-critical -- next heartbeat will retry
    }

    return NextResponse.json({ valid: true, userId: session.user_id, expiresAt: session.expires_at })
  } catch {
    // Top-level catch: even request.json() can throw "Load failed"
    return NextResponse.json({ valid: true, degraded: true })
  }
}
