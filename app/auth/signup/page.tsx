"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/lib/toast"

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [emailOptIn, setEmailOptIn] = useState(false)
  const [emailPreferences, setEmailPreferences] = useState({
    reminders: true,
    confirmations: true,
    promotional: false,
    urgent: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Check if email is blocked
      const { data: blockedEmail } = await supabase
        .from("auth_blocklist")
        .select("email")
        .eq("email", email.toLowerCase())
        .maybeSingle()

      if (blockedEmail) {
        setError("This email address is not permitted to register.")
        setLoading(false)
        return
      }

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
        },
      })

      if (authError) throw authError

      if (authData.user) {
        // Update profile with additional info
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            name,
            phone,
            email_opt_in: emailOptIn,
            email_categories: emailOptIn ? emailPreferences : null,
          })
          .eq("id", authData.user.id)

        if (profileError) {
          console.error("Profile update error:", profileError)
        }

        toast.success("Account created! Please check your email to verify your account.")
        router.push("/calendar")
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Join our volunteer community</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="email-opt-in"
                  checked={emailOptIn}
                  onCheckedChange={(checked) => setEmailOptIn(!!checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="email-opt-in" className="cursor-pointer text-sm font-medium leading-none">
                    Email Communications
                  </Label>
                  <p className="text-xs text-muted-foreground">Receive emails from volunteer@vanderpumpdogs.org</p>
                </div>
              </div>

              {emailOptIn && (
                <div className="ml-7 space-y-2 border-l-2 pl-4">
                  <p className="text-xs font-medium text-muted-foreground">Email Preferences:</p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="reminders"
                        checked={emailPreferences.reminders}
                        onCheckedChange={(checked) =>
                          setEmailPreferences((prev) => ({ ...prev, reminders: !!checked }))
                        }
                      />
                      <Label htmlFor="reminders" className="cursor-pointer text-sm font-normal">
                        Shift reminders
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="confirmations"
                        checked={emailPreferences.confirmations}
                        onCheckedChange={(checked) =>
                          setEmailPreferences((prev) => ({ ...prev, confirmations: !!checked }))
                        }
                      />
                      <Label htmlFor="confirmations" className="cursor-pointer text-sm font-normal">
                        Booking confirmations
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="promotional"
                        checked={emailPreferences.promotional}
                        onCheckedChange={(checked) =>
                          setEmailPreferences((prev) => ({ ...prev, promotional: !!checked }))
                        }
                      />
                      <Label htmlFor="promotional" className="cursor-pointer text-sm font-normal">
                        Promotional messages
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="urgent"
                        checked={emailPreferences.urgent}
                        onCheckedChange={(checked) => setEmailPreferences((prev) => ({ ...prev, urgent: !!checked }))}
                      />
                      <Label htmlFor="urgent" className="cursor-pointer text-sm font-normal">
                        Urgent notifications
                      </Label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>

            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
