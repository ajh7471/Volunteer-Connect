"use client"

import type React from "react"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function ResetPage() {
  const [pw1, setPw1] = useState("")
  const [pw2, setPw2] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setErr(null)

    if (pw1 !== pw2) {
      setErr("Passwords do not match.")
      return
    }

    if (pw1.length < 6) {
      setErr("Password must be at least 6 characters.")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pw1 })
    setLoading(false)

    if (error) {
      setErr(error.message)
    } else {
      setMsg("Password updated successfully! You can now login with your new password.")
      setPw1("")
      setPw2("")
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Re-enter password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {msg && (
              <Alert className="bg-green-50 text-green-900 border-green-200">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{msg}</AlertDescription>
              </Alert>
            )}

            {err && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{err}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>

            {msg && (
              <div className="text-center">
                <Link href="/auth/login" className="text-sm text-primary hover:underline">
                  Go to Login
                </Link>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
