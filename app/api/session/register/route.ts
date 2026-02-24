import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RegisterSessionRequest {
  userId: string
  sessionToken: string
  deviceInfo: {
    fingerprint: string
    browserName: string
    osName: string
    deviceType: "desktop" | "mobile" | "tablet"
    userAgent: string
  }
  config: {
    absoluteTimeoutHours: number
    maxConcurrentSessions: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterSessionRequest = await request.json()
    const { userId, sessionToken, deviceInfo, config } = body

    if (!userId || !sessionToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const expiresAt = new Date(Date.now() + (config.absoluteTimeoutHours || 8) * 60 * 60 * 1000).toISOString()

    // All DB operations are wrapped individually so that "Load failed" on any
    // single Supabase fetch doesn't crash the entire registration. The client
    // already handles degraded mode where server-side tracking is unavailable.
    let supabase: Awaited<ReturnType<typeof createClient>>
    try {
      supabase = await createClient()
    } catch {
      // Can't even create the client -- return degraded success
      return NextResponse.json({ success: true, sessionId: "local", expiresAt, degraded: true })
    }

    // Check table exists
    try {
      const { error: tableCheckError } = await supabase.from("user_sessions").select("id").limit(1)
      if (tableCheckError && (tableCheckError.code === "PGRST116" || tableCheckError.code === "PGRST205" || tableCheckError.code === "42P01")) {
        return NextResponse.json({ success: true, sessionId: "local", expiresAt, tableNotFound: true })
      }
    } catch {
      // "Load failed" on table check -- return degraded success
      return NextResponse.json({ success: true, sessionId: "local", expiresAt, degraded: true })
    }

    const forwardedFor = request.headers.get("x-forwarded-for")
    const ipAddress = forwardedFor?.split(",")[0].trim() || request.headers.get("x-real-ip") || "0.0.0.0"

    // Enforce max concurrent sessions (best-effort)
    if (config.maxConcurrentSessions > 0) {
      try {
        const { count } = await supabase
          .from("user_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_active", true)

        if (count && count >= config.maxConcurrentSessions) {
          const { data: oldestSession } = await supabase
            .from("user_sessions")
            .select("id")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle()

          if (oldestSession) {
            await supabase
              .from("user_sessions")
              .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_reason: "new_session_limit" })
              .eq("id", oldestSession.id)
          }
        }
      } catch {
        // Concurrent session enforcement failed -- continue anyway
      }
    }

    // Create session record
    let sessionId = "local"
    try {
      const { data: session, error: sessionError } = await supabase
        .from("user_sessions")
        .insert({
          user_id: userId,
          session_token: sessionToken,
          device_fingerprint: deviceInfo.fingerprint,
          user_agent: deviceInfo.userAgent,
          ip_address: ipAddress,
          browser_name: deviceInfo.browserName,
          os_name: deviceInfo.osName,
          device_type: deviceInfo.deviceType,
          is_active: true,
          expires_at: expiresAt,
          last_activity_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle()

      if (sessionError || !session) {
        // INSERT failed -- return degraded success so the client doesn't break
        return NextResponse.json({ success: true, sessionId: "local", expiresAt, degraded: true })
      }

      sessionId = session.id
    } catch {
      // "Load failed" on INSERT -- return degraded success
      return NextResponse.json({ success: true, sessionId: "local", expiresAt, degraded: true })
    }

    // Log session event (fire-and-forget, don't block response)
    try {
      await supabase.from("session_events").insert({
        user_id: userId,
        session_id: sessionId,
        event_type: "login",
        event_details: { device_type: deviceInfo.deviceType, browser: deviceInfo.browserName, os: deviceInfo.osName },
        ip_address: ipAddress,
        user_agent: deviceInfo.userAgent,
      })
    } catch {
      // Event logging failed -- non-critical
    }

    return NextResponse.json({ success: true, sessionId, expiresAt })
  } catch {
    // Top-level catch: even request.json() can throw "Load failed"
    return NextResponse.json({ success: true, sessionId: "local", expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), degraded: true })
  }
}
