"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"

type Role = "admin" | "volunteer"

let cachedRole: { userId: string; role: Role; timestamp: number } | null = null
const ROLE_CACHE_TTL = 60000 // 1 minute

export function useSessionRole() {
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const loadCompleted = useRef(false)

  useEffect(() => {
    let mounted = true

    async function load(shouldSetLoading = true) {
      if (shouldSetLoading) setLoading(true)

      try {
        // Use getSession() instead of getUser() to avoid network requests
        // that throw "Load failed" in WebKit iframe sandboxes (v0 preview).
        // getSession() reads from local storage -- no fetch, no lock, no abort.
        const { data: { session } } = await supabase.auth.getSession()

        if (!mounted) return

        if (!session?.user) {
          loadCompleted.current = true
          setUserId(null)
          setRole(null)
          setLoading(false)
          return
        }

        const uid = session.user.id
        setUserId(uid)

        if (cachedRole && cachedRole.userId === uid && Date.now() - cachedRole.timestamp < ROLE_CACHE_TTL) {
          loadCompleted.current = true
          setRole(cachedRole.role)
          setLoading(false)
          return
        }

        const { data, error } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle()

        if (!mounted) return

        loadCompleted.current = true

        if (error) {
          setRole("volunteer")
          setLoading(false)
          return
        }

        const userRole = (data?.role as Role) || "volunteer"
        cachedRole = { userId: uid, role: userRole, timestamp: Date.now() }
        setRole(userRole)
        setLoading(false)
      } catch {
        // getSession() should never throw, but if it does, degrade gracefully
        if (mounted) {
          loadCompleted.current = true
          setUserId(null)
          setRole(null)
          setLoading(false)
        }
      }
    }

    load()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return

      if (event === "SIGNED_OUT") {
        cachedRole = null
        setUserId(null)
        setRole(null)
        setLoading(false)
        return
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await load(false)
      }

      if (event === "USER_UPDATED") {
        cachedRole = null
        await load(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { userId, role, loading }
}

export function clearRoleCache() {
  cachedRole = null
}
