"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const r = useRouter()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      if (!data.user) {
        r.replace("/auth/login")
        return
      }
      setReady(true)
    })()
    return () => {
      mounted = false
    }
  }, [r])

  if (!ready) {
    return (
      <div className="mx-auto mt-16 w-full max-w-md rounded-2xl border bg-background p-6 text-center shadow-sm">
        <p className="text-muted-foreground">Checking session…</p>
      </div>
    )
  }

  return <>{children}</>
}
