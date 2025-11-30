"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const sessionCheckCompleted = useRef(false)

  useEffect(() => {
    let mounted = true

    const checkTimeout = setTimeout(() => {
      if (mounted && !sessionCheckCompleted.current) {
        console.warn("[v0] Session check timeout - showing login")
        setCheckingSession(false)
      }
    }, 2000)

    const checkSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionError || !data.session) {
          sessionCheckCompleted.current = true
          clearTimeout(checkTimeout)
          setCheckingSession(false)
          return
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .maybeSingle()

        if (!mounted) return

        sessionCheckCompleted.current = true
        clearTimeout(checkTimeout)

        const destination = profile?.role === "admin" ? "/admin" : "/volunteer"
        router.replace(destination)
      } catch (error) {
        console.error("[v0] Session check error:", error)
        if (mounted) {
          sessionCheckCompleted.current = true
          clearTimeout(checkTimeout)
          setCheckingSession(false)
        }
      }
    }

    checkSession()

    return () => {
      mounted = false
      clearTimeout(checkTimeout)
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        if (authError.message.includes("Invalid login credentials") || authError.message.includes("invalid")) {
          setError("The password you entered is incorrect. Please check your credentials and try again.")
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Please verify your email address before logging in. Check your inbox for a confirmation link.")
        } else {
          setError("Unable to sign in. Please check your email and password and try again.")
        }
        setLoading(false)
        return
      }

      if (data.user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle()

        const destination = profile?.role === "admin" ? "/admin" : "/volunteer"
        window.location.href = destination
      }
    } catch (error) {
      console.error("[v0] Login error:", error)
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/30 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Volunteer Hub</h1>
          <p className="mt-2 text-sm text-muted-foreground">Coordinate volunteer shifts with ease</p>
        </div>

        <Card className="w-full shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription>Sign in to access your volunteer dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    <p className="font-medium mb-1">{error}</p>
                    {error.includes("password") && (
                      <p className="text-sm mt-2">
                        Need help?{" "}
                        <Link href="/auth/forgot" className="font-medium underline hover:text-red-800">
                          Reset your password
                        </Link>
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>

              <div className="space-y-2 text-center text-sm">
                <Link href="/auth/forgot" className="text-primary hover:underline">
                  Forgot password?
                </Link>
                <p className="text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/auth/signup" className="text-primary hover:underline">
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
            <div className="mt-4 text-left">
              <p className="text-xs text-muted-foreground">v1.4.1</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
