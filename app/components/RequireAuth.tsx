"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface AuthCache {
  user: { id: string; email?: string } | null
  timestamp: number
  isValid: boolean
}

let authCache: AuthCache | null = null
const AUTH_CACHE_TTL = 30000 // 30 seconds cache validity

function getAuthCache(): AuthCache | null {
  if (!authCache) return null
  if (Date.now() - authCache.timestamp > AUTH_CACHE_TTL) {
    authCache = null
    return null
  }
  return authCache
}

function setAuthCache(user: { id: string; email?: string } | null, isValid: boolean) {
  authCache = {
    user,
    timestamp: Date.now(),
    isValid,
  }
}

export function clearAuthCache() {
  authCache = null
}

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const authCheckCompleted = useRef(false)
  const r = useRouter()

  const checkAuth = useCallback(async (retryCount = 0): Promise<boolean> => {
    try {
      // Check cache first for instant response
      const cached = getAuthCache()
      if (cached?.isValid && cached.user) {
        return true
      }

      // Create a timeout promise that rejects after 4 seconds
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Auth check timeout")), 4000)
      )

      // Race the session check against the timeout
      const sessionPromise = supabase.auth.getSession()
      const { data: { session }, error: sessionError } = await Promise.race([sessionPromise, timeoutPromise])

      if (sessionError) {
        console.warn("[v0] RequireAuth session error:", sessionError.message)
        setAuthCache(null, false)
        return false
      }

      if (!session?.user) {
        setAuthCache(null, false)
        return false
      }

      // Cache successful auth from session
      setAuthCache(session.user, true)
      return true
    } catch (error) {
      console.error("[v0] RequireAuth error:", error instanceof Error ? error.message : String(error))
      // Don't retry on timeouts, just fail fast
      if (retryCount === 0 && !(error instanceof Error && error.message === "Auth check timeout")) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        return checkAuth(retryCount + 1)
      }
      return false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const timeout = setTimeout(() => {
      if (mounted && !authCheckCompleted.current) {
        console.warn("[v0] RequireAuth timeout - auth check did not complete in 5s")
        setTimedOut(true)
      }
    }, 5000)

    const performAuthCheck = async () => {
      // Quick check from cache first
      const cached = getAuthCache()
      if (cached?.isValid && cached.user) {
        authCheckCompleted.current = true
        clearTimeout(timeout)
        if (mounted) setReady(true)
        return
      }

      const isAuthenticated = await checkAuth()

      if (!mounted) return

      authCheckCompleted.current = true
      clearTimeout(timeout)

      if (!isAuthenticated) {
        r.replace("/")
        return
      }

      setReady(true)
    }

    performAuthCheck()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === "SIGNED_OUT") {
        clearAuthCache()
        r.replace("/")
      } else if (event === "SIGNED_IN" && session) {
        setAuthCache(session.user, true)
        if (!ready) setReady(true)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [r, checkAuth, ready])

  if (timedOut) {
    return (
      <div className="mx-auto mt-16 w-full max-w-md rounded-2xl border bg-background p-6 text-center shadow-sm">
        <p className="text-muted-foreground mb-4">Session verification is taking longer than expected.</p>
        <div className="flex gap-2 justify-center">
          <Button
            onClick={() => {
              setTimedOut(false)
              authCheckCompleted.current = false
              window.location.reload()
            }}
          >
            Refresh Page
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              clearAuthCache()
              sessionStorage.clear()
              localStorage.clear()
              window.location.href = "/"
            }}
          >
            Return to Login
          </Button>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="mx-auto mt-16 w-full max-w-md rounded-2xl border bg-background p-6 text-center shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
