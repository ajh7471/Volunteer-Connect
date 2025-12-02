import { generateDeviceFingerprint, generateSessionToken } from "./device-fingerprint"
import { initBroadcastChannel, broadcastMessage } from "./broadcast-channel"
import { createActivityTracker } from "./activity-tracker"
import { createBrowserCloseHandler, performLogout } from "./browser-close-handler"
import type { SessionConfig, SessionState, SessionManagerEvents } from "./types"

const SESSION_STORAGE_KEY = "vh_session_token"
const HEARTBEAT_ENDPOINT = "/api/session/heartbeat"
const LOGOUT_ENDPOINT = "/api/session/logout"
const REGISTER_ENDPOINT = "/api/session/register"

interface SessionManagerOptions {
  config?: Partial<SessionConfig>
  events?: SessionManagerEvents
}

export function createSessionManager(options: SessionManagerOptions = {}) {
  const config: SessionConfig = {
    idleTimeoutMinutes: 30,
    absoluteTimeoutHours: 8,
    heartbeatIntervalMinutes: 5,
    warnBeforeTimeoutMinutes: 5,
    maxConcurrentSessions: 0,
    logoutOnBrowserClose: true,
    syncLogoutAcrossTabs: true,
    ...options.config,
  }

  const events = options.events || {}

  let state: SessionState = {
    isAuthenticated: false,
    userId: null,
    sessionToken: null,
    lastActivity: Date.now(),
    isIdle: false,
    showTimeoutWarning: false,
    timeUntilTimeout: 0,
  }

  let heartbeatInterval: ReturnType<typeof setInterval> | null = null
  let timeoutWarningInterval: ReturnType<typeof setInterval> | null = null
  let activityTracker: ReturnType<typeof createActivityTracker> | null = null
  let browserCloseHandler: ReturnType<typeof createBrowserCloseHandler> | null = null
  let broadcastCleanup: (() => void) | null = null
  const listeners: Set<(state: SessionState) => void> = new Set()

  const notifyListeners = () => {
    listeners.forEach((listener) => listener({ ...state }))
  }

  const updateState = (updates: Partial<SessionState>) => {
    state = { ...state, ...updates }
    notifyListeners()
  }

  // Register session with server
  const registerSession = async (userId: string): Promise<string | null> => {
    try {
      const deviceInfo = generateDeviceFingerprint()
      const sessionToken = generateSessionToken()

      const response = await fetch(REGISTER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          sessionToken,
          deviceInfo,
          config,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("[Session] Failed to register session:", error)
        return null
      }

      // Store session token in sessionStorage
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionToken)

      return sessionToken
    } catch (error) {
      console.error("[Session] Error registering session:", error)
      return null
    }
  }

  // Send heartbeat to server
  const sendHeartbeat = async () => {
    if (!state.sessionToken) return

    try {
      const response = await fetch(HEARTBEAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: state.sessionToken }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.expired || data.revoked) {
          // Session is no longer valid on server
          await endSession("session_invalidated")
        }
      }
    } catch (error) {
      console.error("[Session] Heartbeat failed:", error)
    }
  }

  // Start heartbeat interval
  const startHeartbeat = () => {
    if (heartbeatInterval) return

    heartbeatInterval = setInterval(sendHeartbeat, config.heartbeatIntervalMinutes * 60 * 1000)
  }

  // Stop heartbeat interval
  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  }

  // Handle idle state changes
  const handleIdleStart = () => {
    updateState({ isIdle: true })
    events.onIdleStart?.()

    // Start timeout warning countdown
    const warningTime = (config.idleTimeoutMinutes - config.warnBeforeTimeoutMinutes) * 60 * 1000

    setTimeout(() => {
      if (state.isIdle) {
        startTimeoutWarning()
      }
    }, warningTime)
  }

  const handleIdleEnd = () => {
    updateState({ isIdle: false, showTimeoutWarning: false })
    stopTimeoutWarning()
    events.onIdleEnd?.()
  }

  // Timeout warning countdown
  const startTimeoutWarning = () => {
    updateState({ showTimeoutWarning: true })

    let secondsRemaining = config.warnBeforeTimeoutMinutes * 60

    timeoutWarningInterval = setInterval(() => {
      secondsRemaining -= 1
      updateState({ timeUntilTimeout: secondsRemaining })
      events.onTimeoutWarning?.(secondsRemaining)

      if (secondsRemaining <= 0) {
        stopTimeoutWarning()
        endSession("timeout")
        events.onTimeout?.()
      }
    }, 1000)
  }

  const stopTimeoutWarning = () => {
    if (timeoutWarningInterval) {
      clearInterval(timeoutWarningInterval)
      timeoutWarningInterval = null
    }
    updateState({ showTimeoutWarning: false, timeUntilTimeout: 0 })
  }

  // Handle cross-tab messages
  const handleBroadcastMessage = (message: { type: string; payload?: unknown }) => {
    switch (message.type) {
      case "SESSION_LOGOUT":
        // Another tab logged out, end this session too
        endSession("logout_other_tab", false)
        break
      case "SESSION_REFRESH":
        // Another tab refreshed, update our state
        if (state.isIdle) {
          handleIdleEnd()
        }
        break
    }
  }

  // Start a new session
  const startSession = async (userId: string): Promise<boolean> => {
    try {
      const sessionToken = await registerSession(userId)

      if (!sessionToken) {
        return false
      }

      updateState({
        isAuthenticated: true,
        userId,
        sessionToken,
        lastActivity: Date.now(),
        isIdle: false,
      })

      // Initialize activity tracker
      activityTracker = createActivityTracker({
        idleTimeoutMs: config.idleTimeoutMinutes * 60 * 1000,
        onIdle: handleIdleStart,
        onActive: handleIdleEnd,
      })
      activityTracker.start()

      // Initialize browser close handler
      if (config.logoutOnBrowserClose) {
        browserCloseHandler = createBrowserCloseHandler({
          onBeforeUnload: () => {
            // Will be handled by sendBeacon
          },
          onVisibilityChange: (isVisible) => {
            if (isVisible && state.isIdle) {
              handleIdleEnd()
            }
          },
          logoutEndpoint: LOGOUT_ENDPOINT,
          sessionToken,
        })
        browserCloseHandler.start()
      }

      // Initialize cross-tab communication
      if (config.syncLogoutAcrossTabs) {
        broadcastCleanup = initBroadcastChannel(handleBroadcastMessage)
      }

      // Start heartbeat
      startHeartbeat()

      events.onSessionStart?.({
        id: "",
        userId,
        sessionToken,
        deviceType: "desktop",
        isActive: true,
        lastActivityAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + config.absoluteTimeoutHours * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      })

      return true
    } catch (error) {
      console.error("[Session] Failed to start session:", error)
      return false
    }
  }

  // End current session
  const endSession = async (reason = "logout", broadcast = true): Promise<void> => {
    // Stop all trackers
    activityTracker?.stop()
    browserCloseHandler?.stop()
    stopHeartbeat()
    stopTimeoutWarning()
    broadcastCleanup?.()

    // Notify server
    if (state.sessionToken) {
      await performLogout(LOGOUT_ENDPOINT, state.sessionToken, reason)
    }

    // Clear storage
    sessionStorage.removeItem(SESSION_STORAGE_KEY)

    // Clear all session-related storage
    clearAllSessionStorage()

    // Broadcast logout to other tabs
    if (broadcast && config.syncLogoutAcrossTabs) {
      broadcastMessage("SESSION_LOGOUT", { reason })
    }

    // Update state
    updateState({
      isAuthenticated: false,
      userId: null,
      sessionToken: null,
      lastActivity: 0,
      isIdle: false,
      showTimeoutWarning: false,
      timeUntilTimeout: 0,
    })

    events.onSessionEnd?.(reason)
  }

  // Clear all session-related storage
  const clearAllSessionStorage = () => {
    if (typeof window === "undefined") return

    // Clear sessionStorage
    sessionStorage.clear()

    // Clear localStorage items related to session/auth
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (
        key &&
        (key.includes("supabase") || key.includes("sb-") || key.includes("vh_") || key.includes("volunteer-hub"))
      ) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  }

  // Restore session from storage (for page refresh)
  const restoreSession = async (): Promise<boolean> => {
    const storedToken = sessionStorage.getItem(SESSION_STORAGE_KEY)

    if (!storedToken) {
      return false
    }

    // Verify session with server
    try {
      const response = await fetch(HEARTBEAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: storedToken }),
      })

      if (!response.ok) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
        return false
      }

      const data = await response.json()

      if (!data.valid) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
        return false
      }

      // Restore state
      updateState({
        isAuthenticated: true,
        userId: data.userId,
        sessionToken: storedToken,
        lastActivity: Date.now(),
      })

      // Reinitialize trackers
      activityTracker = createActivityTracker({
        idleTimeoutMs: config.idleTimeoutMinutes * 60 * 1000,
        onIdle: handleIdleStart,
        onActive: handleIdleEnd,
      })
      activityTracker.start()

      if (config.logoutOnBrowserClose) {
        browserCloseHandler = createBrowserCloseHandler({
          onBeforeUnload: () => {},
          onVisibilityChange: (isVisible) => {
            if (isVisible && state.isIdle) {
              handleIdleEnd()
            }
          },
          logoutEndpoint: LOGOUT_ENDPOINT,
          sessionToken: storedToken,
        })
        browserCloseHandler.start()
      }

      if (config.syncLogoutAcrossTabs) {
        broadcastCleanup = initBroadcastChannel(handleBroadcastMessage)
      }

      startHeartbeat()

      return true
    } catch (error) {
      console.error("[Session] Failed to restore session:", error)
      return false
    }
  }

  // Extend session (reset timeout)
  const extendSession = () => {
    if (!state.isAuthenticated) return

    updateState({ lastActivity: Date.now() })
    stopTimeoutWarning()
    handleIdleEnd()

    // Notify other tabs
    broadcastMessage("SESSION_REFRESH")
  }

  // Subscribe to state changes
  const subscribe = (listener: (state: SessionState) => void): (() => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  // Get current state
  const getState = (): SessionState => ({ ...state })

  // Get session token
  const getSessionToken = (): string | null => state.sessionToken

  return {
    startSession,
    endSession,
    restoreSession,
    extendSession,
    subscribe,
    getState,
    getSessionToken,
    clearAllSessionStorage,
  }
}

// Singleton instance
let sessionManagerInstance: ReturnType<typeof createSessionManager> | null = null

export function getSessionManager(options?: SessionManagerOptions): ReturnType<typeof createSessionManager> {
  if (!sessionManagerInstance) {
    sessionManagerInstance = createSessionManager(options)
  }
  return sessionManagerInstance
}

export function resetSessionManager(): void {
  sessionManagerInstance = null
}
