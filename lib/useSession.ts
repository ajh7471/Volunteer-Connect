"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Role = "admin" | "volunteer"

export function useSessionRole() {
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      console.log("[v0] useSessionRole: Loading user session...")
      setLoading(true)
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id || null
      console.log("[v0] useSessionRole: User ID:", uid)

      if (!mounted) return
      setUserId(uid)

      if (!uid) {
        console.log("[v0] useSessionRole: No user, setting role to null")
        setRole(null)
        setLoading(false)
        return
      }

      const { data, error } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle()

      if (!mounted) return
      if (error) {
        console.error("[v0] useSessionRole: Error fetching role:", error)
        setRole(null)
        setLoading(false)
        return
      }
      const userRole = (data?.role as Role) || "volunteer"
      console.log("[v0] useSessionRole: Role loaded:", userRole)
      setRole(userRole)
      setLoading(false)
    }

    load()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[v0] useSessionRole: Auth state changed:", event, "Session:", !!session)
      if (!mounted) return

      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        // Reload user data when auth state changes
        await load()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { userId, role, loading }
}
