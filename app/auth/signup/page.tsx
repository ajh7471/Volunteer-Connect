// ============================================================================
// SIGNUP PAGE: User Registration with Email Preferences
// ============================================================================
// This page allows new volunteers to create an account with granular control
// over email communications. Features include:
// - Basic account information (name, email, phone, password)
// - Email blocklist checking to prevent banned addresses from registering
// - Opt-in email preferences with category selection
// - Integration with Supabase Auth for secure authentication
// ============================================================================

"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from 'next/navigation'
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
  // Next.js router for navigation after successful signup
  const router = useRouter()

  // ----------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ----------------------------------------------------------------------------
  // Basic account information
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  // Email communication preferences
  // emailOptIn: Master switch - if false, user receives NO emails
  const [emailOptIn, setEmailOptIn] = useState(false)

  // emailPreferences: Granular controls for different email types
  // Only applies if emailOptIn is true
  const [emailPreferences, setEmailPreferences] = useState({
    reminders: true, // Shift reminder emails before their scheduled shift
    confirmations: true, // Booking confirmation when they sign up for a shift
    promotional: false, // Marketing and promotional messages (opt-out by default)
    urgent: true, // Urgent notifications (last-minute coverage needed, etc.)
  })

  // UI state
  const [loading, setLoading] = useState(false) // Show loading indicator during signup
  const [error, setError] = useState("") // Display error messages to user

  // ----------------------------------------------------------------------------
  // SIGNUP HANDLER
  // ----------------------------------------------------------------------------
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault() // Prevent default form submission (page reload)
    setError("") // Clear any previous error messages
    setLoading(true) // Show loading state on the submit button

    try {
      // STEP 1: Check if email is on the blocklist
      // This prevents banned email addresses from creating accounts
      const { data: blockedEmail } = await supabase
        .from("auth_blocklist")
        .select("email")
        .eq("email", email.toLowerCase()) // Always use lowercase for consistency
        .maybeSingle() // Returns null if not found (won't throw error)

      // If email is blocked, show error and stop the signup process
      if (blockedEmail) {
        setError("This email address is not permitted to register.")
        setLoading(false)
        return
      }

      // STEP 2: Create the user account with Supabase Auth
      // This creates an entry in auth.users and triggers the profile creation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // emailRedirectTo: Where to send the user after email verification
          // Uses DEV override for local testing, otherwise uses current origin
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
        },
      })

      // If auth signup failed, throw the error to be caught below
      if (authError) throw authError

      // STEP 3: Update the user's profile with additional information
      // The profile is auto-created by database trigger when auth user is created
      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            name, // User's full name
            phone, // Contact phone number
            email_opt_in: emailOptIn, // Master email switch
            email_categories: emailOptIn ? emailPreferences : null, // Only save prefs if opted in
          })
          .eq("id", authData.user.id) // Update the profile for this specific user

        // Log profile errors but don't block signup (profile can be updated later)
        if (profileError) {
          console.error("Profile update error:", profileError)
        }

        // STEP 4: Show success message and redirect to volunteer dashboard
        toast.success("Account created! Please check your email to verify your account.")
        router.push("/volunteer")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create account"
      setError(errorMessage)
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
            {/* Error Alert: Shows validation or server errors */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Full Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
            </div>

            {/* Email Input - Used for login and notifications */}
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

            {/* Phone Number - Required for admin contact */}
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

            {/* Password Input - Minimum 6 characters required by Supabase */}
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

            {/* Email Preferences Section */}
            <div className="space-y-3 rounded-lg border p-4">
              {/* Master Email Opt-In Toggle */}
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

              {/* Granular Email Category Preferences - Only shown if opted in */}
              {emailOptIn && (
                <div className="ml-7 space-y-2 border-l-2 pl-4">
                  <p className="text-xs font-medium text-muted-foreground">Email Preferences:</p>
                  <div className="space-y-2">
                    {/* Shift Reminders Checkbox */}
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

                    {/* Booking Confirmations Checkbox */}
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

                    {/* Promotional Messages Checkbox (default: unchecked) */}
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

                    {/* Urgent Notifications Checkbox */}
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

            {/* Submit Button - Disabled during loading */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>

            {/* Link to Login Page for existing users */}
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
