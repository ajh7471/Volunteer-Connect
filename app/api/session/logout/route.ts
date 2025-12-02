import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface LogoutRequest {
  sessionToken: string
  reason?: string
}

export async function POST(request: NextRequest) {
  try {
    let body: LogoutRequest

    // Handle both JSON and sendBeacon (which sends as blob)
    const contentType = request.headers.get("content-type")
    if (contentType?.includes("application/json")) {
      body = await request.json()
    } else {
      const text = await request.text()
      body = JSON.parse(text)
    }

    const { sessionToken, reason = "logout" } = body

    if (!sessionToken) {
      return NextResponse.json({ error: "Missing session token" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get client IP
    const forwardedFor = request.headers.get("x-forwarded-for")
    const ipAddress = forwardedFor?.split(",")[0].trim() || request.headers.get("x-real-ip") || "0.0.0.0"

    // Find session
    const { data: session, error: findError } = await supabase
      .from("user_sessions")
      .select("id, user_id, is_active")
      .eq("session_token", sessionToken)
      .single()

    if (findError || !session) {
      // Session might already be deleted, that's okay
      return NextResponse.json({ success: true, alreadyLoggedOut: true })
    }

    // Only update if still active
    if (session.is_active) {
      // Revoke the session
      const { error: updateError } = await supabase
        .from("user_sessions")
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_reason: reason,
        })
        .eq("id", session.id)

      if (updateError) {
        console.error("[Session API] Failed to revoke session:", updateError)
      }

      // Log the logout event
      await supabase.from("session_events").insert({
        user_id: session.user_id,
        session_id: session.id,
        event_type: "logout",
        event_details: { reason },
        ip_address: ipAddress,
        user_agent: request.headers.get("user-agent") || "",
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Session API] Logout error:", error)
    // Don't return error for logout - it's best-effort
    return NextResponse.json({ success: true, error: "Logout completed with errors" })
  }
}
