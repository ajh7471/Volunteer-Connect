"use client"

import { useEffect } from "react"
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new login page at root
    router.replace("/")
  }, [router])

  return null
}
