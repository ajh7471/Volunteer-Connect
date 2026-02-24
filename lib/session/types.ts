// Session Management Types

export interface SessionConfig {
  idleTimeoutMinutes: number
  absoluteTimeoutHours: number
  heartbeatIntervalMinutes: number
  warnBeforeTimeoutMinutes: number
  maxConcurrentSessions: number
  logoutOnBrowserClose: boolean
  syncLogoutAcrossTabs: boolean
}

export interface UserSession {
  id: string
  userId: string
  sessionToken: string
  deviceFingerprint?: string
  userAgent?: string
  ipAddress?: string
  browserName?: string
  osName?: string
  deviceType: "desktop" | "mobile" | "tablet"
  isActive: boolean
  lastActivityAt: string
  expiresAt: string
  createdAt: string
  revokedAt?: string
  revokedReason?: string
}

export interface SessionEvent {
  id: string
  userId?: string
  sessionId?: string
  eventType: "login" | "logout" | "timeout" | "refresh" | "revoke" | "activity" | "revoke_all"
  eventDetails: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export interface SessionState {
  isAuthenticated: boolean
  userId: string | null
  sessionToken: string | null
  lastActivity: number
  isIdle: boolean
  showTimeoutWarning: boolean
  timeUntilTimeout: number
}

export type SessionEventType =
  | "SESSION_START"
  | "SESSION_END"
  | "SESSION_TIMEOUT"
  | "SESSION_REFRESH"
  | "ACTIVITY_DETECTED"
  | "IDLE_START"
  | "IDLE_END"
  | "TAB_HIDDEN"
  | "TAB_VISIBLE"
  | "BROWSER_CLOSE"

export interface SessionManagerEvents {
  onSessionStart?: (session: UserSession) => void
  onSessionEnd?: (reason: string) => void
  onIdleStart?: () => void
  onIdleEnd?: () => void
  onTimeoutWarning?: (secondsRemaining: number) => void
  onTimeout?: () => void
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  idleTimeoutMinutes: 30,
  absoluteTimeoutHours: 8,
  heartbeatIntervalMinutes: 5,
  warnBeforeTimeoutMinutes: 5,
  maxConcurrentSessions: 0,
  logoutOnBrowserClose: true,
  syncLogoutAcrossTabs: true,
}
