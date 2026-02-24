// Session Management Module Exports

export { createSessionManager, getSessionManager, resetSessionManager } from "./session-manager"
export { SessionProvider, useSession, useSessionState } from "./session-provider"
export { SessionTimeoutWarning } from "@/components/session-timeout-warning"
export { ActiveSessions } from "@/components/active-sessions"
export { generateDeviceFingerprint, generateSessionToken } from "./device-fingerprint"
export { initBroadcastChannel, broadcastMessage, getTabId } from "./broadcast-channel"
export { createActivityTracker } from "./activity-tracker"
export { createBrowserCloseHandler, performLogout } from "./browser-close-handler"

export type {
  SessionConfig,
  UserSession,
  SessionEvent,
  SessionState,
  SessionEventType,
  SessionManagerEvents,
} from "./types"

export { DEFAULT_SESSION_CONFIG } from "./types"
