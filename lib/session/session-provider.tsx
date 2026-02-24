"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { type createSessionManager, getSessionManager } from "./session-manager"
import type { SessionState, SessionConfig } from "./types"
import { supabase } from "@/lib/supabaseClient"

interface SessionContextValue {
  state: SessionState
  login: (userId: string) => Promise<boolean>
  logout: (reason?: string) => Promise<void>
  extendSession: () => void
  isLoading: boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

interface SessionProviderProps {
  children: React.ReactNode
  config?: Partial<SessionConfig>
  onSessionTimeout?: () => void
  onSessionEnd?: (reason: string) => void
}

export function SessionProvider({ children, config, onSessionTimeout, onSessionEnd }: SessionProviderProps) {
  const [state, setState] = useState<SessionState>({
    isAuthenticated: false,
    userId: null,
    sessionToken: null,
    lastActivity: Date.now(),
    isIdle: false,
    showTimeoutWarning: false,
    timeUntilTimeout: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const managerRef = useRef<ReturnType<typeof createSessionManager> | null>(null)
  const initializedRef = useRef(false)

  // Initialize session manager
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const manager = getSessionManager({
      config,
      events: {
        onSessionEnd: (reason) => {
          onSessionEnd?.(reason)
          if (reason === "timeout") {
            onSessionTimeout?.()
          }
        },
        onTimeout: () => {
          onSessionTimeout?.()
        },
      },
    })

    managerRef.current = manager

    // Subscribe to state changes
    const unsubscribe = manager.subscribe((newState) => {
      setState(newState)
    })

    // Track whether initializeSession already started a session to prevent
    // onAuthStateChange from creating a duplicate.
    let sessionStartedByInit = false

    // Check for existing Supabase session and restore our app session.
    // Uses getSession() instead of getUser() to avoid network requests
    // that fail with "Load failed" in WebKit iframe sandboxes (v0 preview).
    const initializeSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          const restored = await manager.restoreSession()
          if (!restored) {
            // Only start a new server session if we don't already have one
            // (restoreSession failed because sessionStorage was empty or
            // the heartbeat failed). Guard with a flag so onAuthStateChange
            // doesn't create a second row.
            const currentState = manager.getState()
            if (!currentState.isAuthenticated) {
              sessionStartedByInit = true
              await manager.startSession(session.user.id)
            }
          } else {
            sessionStartedByInit = true
          }
        }
      } catch {
        // Silently ignore -- session features degrade gracefully
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()

    // Listen for Supabase auth changes.
    // SIGNED_IN fires on every page load (not just actual logins), so we
    // must skip it if initializeSession already handled the session.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === "SIGNED_IN" && session?.user) {
          // Only create a session if init hasn't already done so
          const currentState = manager.getState()
          if (!sessionStartedByInit && !currentState.isAuthenticated) {
            await manager.startSession(session.user.id)
          }
        } else if (event === "SIGNED_OUT") {
          sessionStartedByInit = false
          await manager.endSession("supabase_signout")
        }
      } catch {
        // Silently ignore network errors during auth state changes
      }
    })

    return () => {
      unsubscribe()
      subscription.unsubscribe()
    }
  }, [config, onSessionEnd, onSessionTimeout])

  const login = useCallback(async (userId: string): Promise<boolean> => {
    if (!managerRef.current) return false
    return managerRef.current.startSession(userId)
  }, [])

  const logout = useCallback(async (reason = "manual_logout"): Promise<void> => {
    if (!managerRef.current) return
    await managerRef.current.endSession(reason)
  }, [])

  const extendSession = useCallback(() => {
    managerRef.current?.extendSession()
  }, [])

  return (
    <SessionContext.Provider value={{ state, login, logout, extendSession, isLoading }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return context
}

export function useSessionState(): SessionState {
  const { state } = useSession()
  return state
}
