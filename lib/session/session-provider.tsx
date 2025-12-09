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

    // Check for existing Supabase session and restore our session
    const initializeSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          // Try to restore existing session
          const restored = await manager.restoreSession()

          if (!restored) {
            // Start new session if restore failed
            await manager.startSession(session.user.id)
          }
        }
      } catch (error) {
        console.error("[SessionProvider] Initialization error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()

    // Listen for Supabase auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await manager.startSession(session.user.id)
      } else if (event === "SIGNED_OUT") {
        await manager.endSession("supabase_signout")
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
