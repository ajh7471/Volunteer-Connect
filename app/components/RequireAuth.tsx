"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const authCheckCompleted = useRef(false)
  const r = useRouter()

  useEffect(() => {
    let mounted = true

    const timeout = setTimeout(() => {
      if (mounted && !authCheckCompleted.current) {
        console.warn("[v0] RequireAuth timeout - auth check did not complete in time")
        setTimedOut(true)
      }
    }, 2500)

    const checkAuth = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionError || !sessionData.session) {
          authCheckCompleted.current = true
          r.replace("/")
          return
        }

        authCheckCompleted.current = true
        clearTimeout(timeout)
        setReady(true)
      } catch (error) {
        console.error("[v0] RequireAuth error:", error)
        if (mounted) {
          authCheckCompleted.current = true
          r.replace("/")
        }
      }
    }

    checkAuth()

    return () => {
      mounted = false
      clearTimeout(timeout)
    }
  }, [r])

  if (timedOut) {
    return (
      <div className="mx-auto mt-16 w-full max-w-md rounded-2xl border bg-background p-6 text-center shadow-sm">
        <p className="text-muted-foreground mb-4">Session verification is taking longer than expected.</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          <Button
            variant="outline"
            onClick={() => {
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
        <div className="flex items-center justify-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
