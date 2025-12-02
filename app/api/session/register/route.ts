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

    const supabase = await createClient()

    // Get client IP address
    const forwardedFor = request.headers.get("x-forwarded-for")
    const ipAddress = forwardedFor?.split(",")[0].trim() || request.headers.get("x-real-ip") || "0.0.0.0"

    // Calculate session expiration
    const expiresAt = new Date(Date.now() + (config.absoluteTimeoutHours || 8) * 60 * 60 * 1000).toISOString()

    // Check max concurrent sessions
    if (config.maxConcurrentSessions > 0) {
      const { count } = await supabase
        .from("user_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_active", true)

      if (count && count >= config.maxConcurrentSessions) {
        // Revoke oldest session
        const { data: oldestSession } = await supabase
          .from("user_sessions")
          .select("id")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .single()

        if (oldestSession) {
          await supabase
            .from("user_sessions")
            .update({
              is_active: false,
              revoked_at: new Date().toISOString(),
              revoked_reason: "new_session_limit",
            })
            .eq("id", oldestSession.id)
        }
      }
    }

    // Create new session record
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
      .single()

    if (sessionError) {
      console.error("[Session API] Failed to create session:", sessionError)
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
    }

    // Log session event
    await supabase.from("session_events").insert({
      user_id: userId,
      session_id: session.id,
      event_type: "login",
      event_details: {
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browserName,
        os: deviceInfo.osName,
      },
      ip_address: ipAddress,
      user_agent: deviceInfo.userAgent,
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      expiresAt,
    })
  } catch (error) {
    console.error("[Session API] Register error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
