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
      setLoading(true)
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
        setRole(null)
        setLoading(false)
        return
      }
      setRole((data?.role as Role) || "volunteer")
      setLoading(false)
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  return { userId, role, loading }
}
