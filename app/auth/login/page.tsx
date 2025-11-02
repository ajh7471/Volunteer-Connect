"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const r = useRouter()
  const [email, setEmail] = useState("")
  const [pw, setPw] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setLoading(false)
    if (error) return setErr(error.message)
    r.push("/calendar")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
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
                placeholder="Enter your password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {err && (
              <Alert variant="destructive">
                <AlertDescription>{err}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Link href="/auth/forgot" className="hover:text-foreground underline underline-offset-4">
              Forgot password?
            </Link>
            <span>·</span>
            <Link href="/auth/signup" className="hover:text-foreground underline underline-offset-4">
              Create account
            </Link>
          </div>
        </CardFooter>
      </Card>
    </main>
  )
}
