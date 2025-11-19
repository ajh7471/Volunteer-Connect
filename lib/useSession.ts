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

    async function load(shouldSetLoading: boolean = true) {
      if (shouldSetLoading) setLoading(true)
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id || null

      if (!mounted) return
      setUserId(uid)

      if (!uid) {
        setRole(null)
        setLoading(false)
        return
      }

      const { data, error } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle()

      if (!mounted) return
      if (error) {
        console.error("Error fetching role:", error)
        setRole(null)
        setLoading(false)
        return
      }
      const userRole = (data?.role as Role) || "volunteer"
      setRole(userRole)
      setLoading(false)
    }

    load()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === "SIGNED_OUT") {
        // Immediately clear state on sign out
        setUserId(null)
        setRole(null)
        setLoading(false)
        return
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Reload user data when auth state changes
        await load(false)
      }

      if (event === "USER_UPDATED") {
        // Re-validate session on user updates (password change, etc.)
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
