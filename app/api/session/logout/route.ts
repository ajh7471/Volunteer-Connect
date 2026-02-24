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

    let supabase: Awaited<ReturnType<typeof createClient>>
    try {
      supabase = await createClient()
    } catch {
      return NextResponse.json({ success: true, degraded: true })
    }

    const forwardedFor = request.headers.get("x-forwarded-for")
    const ipAddress = forwardedFor?.split(",")[0].trim() || request.headers.get("x-real-ip") || "0.0.0.0"

    // Find session (best-effort)
    let session: { id: string; user_id: string; is_active: boolean } | null = null
    try {
      const { data, error: findError } = await supabase
        .from("user_sessions")
        .select("id, user_id, is_active")
        .eq("session_token", sessionToken)
        .maybeSingle()

      if (findError) {
        return NextResponse.json({ success: true, alreadyLoggedOut: true })
      }
      session = data
    } catch {
      // "Load failed" -- nothing to revoke server-side
      return NextResponse.json({ success: true, degraded: true })
    }

    if (!session) {
      return NextResponse.json({ success: true, alreadyLoggedOut: true })
    }

    if (session.is_active) {
      try {
        await supabase
          .from("user_sessions")
          .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_reason: reason })
          .eq("id", session.id)
      } catch {
        // Best-effort revocation
      }

      try {
        await supabase.from("session_events").insert({
          user_id: session.user_id,
          session_id: session.id,
          event_type: "logout",
          event_details: { reason },
          ip_address: ipAddress,
          user_agent: request.headers.get("user-agent") || "",
        })
      } catch {
        // Best-effort event logging
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    // Top-level: even request.json() / request.text() can throw "Load failed"
    return NextResponse.json({ success: true, degraded: true })
  }
}
