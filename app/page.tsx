"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Info } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

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
    } else if (data.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle()

      await new Promise((resolve) => setTimeout(resolve, 100))

      const destination = profile?.role === "admin" ? "/admin" : "/volunteer"
      window.location.href = destination
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
      <div className="w-full max-w-md space-y-6">
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="ml-2">
            <span className="text-sm">
              New to Volunteer Connect?{" "}
              <Link href="/about" className="font-medium text-primary underline hover:text-primary/80">
                Learn more about our platform
              </Link>
            </span>
          </AlertDescription>
        </Alert>

        <Card className="w-full">
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
