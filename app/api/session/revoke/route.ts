import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RevokeRequest {
  sessionId?: string // Revoke specific session
  userId?: string // Revoke all sessions for user
  revokeAll?: boolean // If true with userId, revoke all user sessions
  reason?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RevokeRequest = await request.json()
    const { sessionId, userId, revokeAll, reason = "admin_revoke" } = body

    const supabase = await createClient()

    // Verify the requester is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin for revoking other users' sessions
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    const isAdmin = profile?.role === "admin"
    const targetUserId = userId || user.id

    // Non-admins can only revoke their own sessions
    if (!isAdmin && targetUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let revokedCount = 0

    if (sessionId) {
      // Revoke specific session
      const { data: session } = await supabase.from("user_sessions").select("user_id").eq("id", sessionId).single()

      // Verify ownership or admin
      if (session && (session.user_id === user.id || isAdmin)) {
        const { error } = await supabase
          .from("user_sessions")
          .update({
            is_active: false,
            revoked_at: new Date().toISOString(),
            revoked_reason: reason,
          })
          .eq("id", sessionId)
          .eq("is_active", true)

        if (!error) {
          revokedCount = 1

          // Log event
          await supabase.from("session_events").insert({
            user_id: session.user_id,
            session_id: sessionId,
            event_type: "revoke",
            event_details: {
              reason,
              revoked_by: user.id,
              is_admin_action: isAdmin && session.user_id !== user.id,
            },
          })
        }
      }
    } else if (revokeAll && targetUserId) {
      // Revoke all sessions for user
      const { data: sessions } = await supabase
        .from("user_sessions")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("is_active", true)

      if (sessions && sessions.length > 0) {
        const { error } = await supabase
          .from("user_sessions")
          .update({
            is_active: false,
            revoked_at: new Date().toISOString(),
            revoked_reason: reason,
          })
          .eq("user_id", targetUserId)
          .eq("is_active", true)

        if (!error) {
          revokedCount = sessions.length

          // Log event
          await supabase.from("session_events").insert({
            user_id: targetUserId,
            event_type: "revoke_all",
            event_details: {
              reason,
              count: revokedCount,
              revoked_by: user.id,
              is_admin_action: isAdmin && targetUserId !== user.id,
            },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      revokedCount,
    })
  } catch (error) {
    console.error("[Session API] Revoke error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
