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

    const supabase = await createClient()

    // Find and validate session
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("id, user_id, is_active, expires_at, revoked_at")
      .eq("session_token", sessionToken)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ valid: false, error: "Session not found" }, { status: 404 })
    }

    // Check if session is revoked
    if (session.revoked_at) {
      return NextResponse.json({
        valid: false,
        revoked: true,
        error: "Session has been revoked",
      })
    }

    // Check if session is active
    if (!session.is_active) {
      return NextResponse.json({
        valid: false,
        expired: true,
        error: "Session is not active",
      })
    }

    // Check if session has expired
    if (new Date(session.expires_at) < new Date()) {
      // Mark session as inactive
      await supabase
        .from("user_sessions")
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_reason: "timeout",
        })
        .eq("id", session.id)

      return NextResponse.json({
        valid: false,
        expired: true,
        error: "Session has expired",
      })
    }

    // Update last activity
    const { error: updateError } = await supabase
      .from("user_sessions")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", session.id)

    if (updateError) {
      console.error("[Session API] Failed to update activity:", updateError)
    }

    return NextResponse.json({
      valid: true,
      userId: session.user_id,
      expiresAt: session.expires_at,
    })
  } catch (error) {
    console.error("[Session API] Heartbeat error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
