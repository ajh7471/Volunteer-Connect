"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useSession } from "@/lib/session/session-provider"

type Role = "admin" | "volunteer"

let cachedRole: { userId: string; role: Role; timestamp: number } | null = null
const ROLE_CACHE_TTL = 300000 // 5 minutes

export function useSessionRole() {
  // Pull userId from the already-resolved session provider — no extra
  // getSession() call needed, no network, no extra latency.
  const { state: sessionState, isLoading: sessionLoading } = useSession()
  const providerUserId = sessionState.userId

  const [role, setRole] = useState<Role | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const fetchedForRef = useRef<string | null>(null)

  useEffect(() => {
    let mounted = true

    // While the session provider is still initialising, stay in loading state.
    if (sessionLoading) return

    // Provider is done — if there's no user we're unauthenticated.
    if (!providerUserId) {
      cachedRole = null
      fetchedForRef.current = null
      setRole(null)
      setRoleLoading(false)
      return
    }

    // Don't re-fetch if we already loaded for this userId
    if (fetchedForRef.current === providerUserId) return

    const uid = providerUserId

    // Check in-memory cache first
    if (cachedRole && cachedRole.userId === uid && Date.now() - cachedRole.timestamp < ROLE_CACHE_TTL) {
      fetchedForRef.current = uid
      setRole(cachedRole.role)
      setRoleLoading(false)
      return
    }

    // Fetch role from DB — single lightweight query, no auth network call
    const fetchRole = async () => {
      // Hard safety: never hang for more than 4s
      const timer = setTimeout(() => {
        if (mounted && roleLoading) {
          fetchedForRef.current = uid
          setRole("volunteer")
          setRoleLoading(false)
        }
      }, 4000)

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .maybeSingle()

        clearTimeout(timer)
        if (!mounted) return

        fetchedForRef.current = uid
        const userRole = (!error && (data?.role as Role)) || "volunteer"
        cachedRole = { userId: uid, role: userRole, timestamp: Date.now() }
        setRole(userRole)
      } catch {
        clearTimeout(timer)
        if (mounted) {
          fetchedForRef.current = uid
          setRole("volunteer")
        }
      } finally {
        if (mounted) setRoleLoading(false)
      }
    }

    fetchRole()

    return () => {
      mounted = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerUserId, sessionLoading])

  return {
    userId: providerUserId,
    role,
    loading: sessionLoading || roleLoading,
  }
}

export function clearRoleCache() {
  cachedRole = null
}
