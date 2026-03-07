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

    // Check for existing Supabase session and restore our app session.
    // Uses getSession() only — never getUser() or onAuthStateChange —
    // because both of those trigger _getUser() network calls internally
    // which fail with "Failed to fetch" in production when the token needs
    // refreshing but the network is momentarily unavailable.
    const initializeSession = async () => {
      try {
        let session = null
        try {
          const result = await supabase.auth.getSession()
          session = result.data?.session ?? null
        } catch {
          // getSession() threw — treat as no session
        }

        if (session?.user) {
          try {
            const restored = await manager.restoreSession()
            if (!restored) {
              const currentState = manager.getState()
              if (!currentState.isAuthenticated) {
                await manager.startSession(session.user.id)
              }
            }
          } catch {
            // Session restore failed — user treated as unauthenticated
          }
        }
      } catch {
        // Outer catch — silently degrade
      } finally {
        setIsLoading(false)
      }
    }

    // Safety net: unblock loading after 3s regardless
    const loadingFallback = setTimeout(() => setIsLoading(false), 3000)
    initializeSession().finally(() => clearTimeout(loadingFallback))

    // NOTE: We intentionally do NOT use supabase.auth.onAuthStateChange here.
    // In @supabase/auth-js v2.x, onAuthStateChange internally calls _getUser()
    // on every SIGNED_IN event to revalidate the token over the network.
    // This is the direct cause of the "Failed to fetch" / auth timeout errors
    // seen in production. Session state is fully managed by this provider via
    // getSession() (local storage read, no network) and the session manager.

    return () => {
      unsubscribe()
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
