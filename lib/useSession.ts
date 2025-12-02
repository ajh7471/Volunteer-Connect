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

    const loadTimeout = setTimeout(() => {
      if (mounted && !loadCompleted.current) {
        console.warn("[v0] Session load timeout - clearing state")
        setUserId(null)
        setRole(null)
        setLoading(false)
      }
    }, 3000)

    async function load(shouldSetLoading = true) {
      if (shouldSetLoading) setLoading(true)

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionError || !sessionData.session) {
          loadCompleted.current = true
          clearTimeout(loadTimeout)
          setUserId(null)
          setRole(null)
          setLoading(false)
          return
        }

        const uid = sessionData.session.user.id
        setUserId(uid)

        if (cachedRole && cachedRole.userId === uid && Date.now() - cachedRole.timestamp < ROLE_CACHE_TTL) {
          loadCompleted.current = true
          clearTimeout(loadTimeout)
          setRole(cachedRole.role)
          setLoading(false)
          return
        }

        const { data, error } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle()

        if (!mounted) return

        loadCompleted.current = true
        clearTimeout(loadTimeout)

        if (error) {
          console.error("[v0] Error fetching role:", error)
          setRole("volunteer")
          setLoading(false)
          return
        }

        const userRole = (data?.role as Role) || "volunteer"

        cachedRole = { userId: uid, role: userRole, timestamp: Date.now() }

        setRole(userRole)
        setLoading(false)
      } catch (error) {
        console.error("[v0] Session load error:", error)
        if (mounted) {
          loadCompleted.current = true
          clearTimeout(loadTimeout)
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
      clearTimeout(loadTimeout)
    }
  }, [])

  return { userId, role, loading }
}

export function clearRoleCache() {
  cachedRole = null
}
