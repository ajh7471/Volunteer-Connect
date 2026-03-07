"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Eye, EyeOff, Loader2, Heart, Shield, CalendarDays } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [logoError, setLogoError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const sessionCheckCompleted = useRef(false)

  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!mounted) return

        if (!session?.user) {
          sessionCheckCompleted.current = true
          setCheckingSession(false)
          return
        }

        // Session exists -- fetch role to determine redirect destination.
        sessionCheckCompleted.current = true
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle()

          if (!mounted) return
          router.replace(profile?.role === "admin" ? "/admin" : "/volunteer")
        } catch {
          if (mounted) router.replace("/volunteer")
        }
      } catch {
        if (mounted) {
          sessionCheckCompleted.current = true
          setCheckingSession(false)
        }
      }
    }

    checkSession()

    return () => { mounted = false }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Retry helper for "Load failed" errors in WebKit iframe sandboxes
    const attemptSignIn = async (retries = 2): Promise<{ data: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["data"]; error: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["error"] }> => {
      try {
        return await supabase.auth.signInWithPassword({ email, password })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ""
        if (msg.includes("Load failed") && retries > 0) {
          // Wait briefly then retry
          await new Promise((r) => setTimeout(r, 500))
          return attemptSignIn(retries - 1)
        }
        throw err
      }
    }

    try {
      const { data, error: authError } = await attemptSignIn()

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
        let destination = "/volunteer"
        try {
          const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle()
          if (profile?.role === "admin") {
            destination = "/admin"
          }
        } catch {
          // Profile fetch failed -- still redirect to default
        }
        window.location.href = destination
      }
    } catch (err) {
      // "Load failed" in WebKit / network errors
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("Load failed")) {
        setError("A network error occurred. Please check your connection and try again.")
      } else {
        setError("An unexpected error occurred. Please try again.")
      }
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          {!logoError ? (
            <Image
              src="/images/vanderpump-dogs-logo.png"
              alt="Vanderpump Dogs Foundation"
              width={200}
              height={100}
              className="mb-4 object-contain"
              priority
              onError={() => setLogoError(true)}
            />
          ) : (
            <h1 className="mb-4 text-2xl font-bold text-primary">Vanderpump Dogs</h1>
          )}
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Left: Hero image panel -- hidden on mobile, shown on lg+ */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-[55%] items-end overflow-hidden bg-foreground">
        <Image
          src="/images/login-hero.jpg"
          alt="Rescued dogs at Vanderpump Dogs"
          fill
          className="object-cover opacity-80"
          priority
        />
        {/* Overlay gradient from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/30 to-transparent" />
        <div className="relative z-10 flex flex-col gap-6 p-10 pb-12 xl:p-14 xl:pb-16">
          <div className="flex items-center gap-3">
            {!logoError ? (
              <Image
                src="/images/vanderpump-dogs-logo.png"
                alt="Vanderpump Dogs Foundation"
                width={180}
                height={90}
                className="object-contain brightness-0 invert"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-2xl font-bold text-background">Vanderpump Dogs</span>
            )}
          </div>
          <h2 className="max-w-md text-balance text-3xl font-bold leading-tight tracking-tight text-background xl:text-4xl">
            Every paw needs a helping hand
          </h2>
          <p className="max-w-md text-pretty text-background/70 leading-relaxed">
            Join our volunteer community and help make a difference in the lives of rescued dogs.
            Sign up for shifts, track your schedule, and connect with fellow volunteers.
          </p>
          <div className="flex gap-6 pt-2">
            <div className="flex items-center gap-2 text-sm text-background/60">
              <Heart className="h-4 w-4 text-primary" />
              <span>500+ dogs rescued</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-background/60">
              <Shield className="h-4 w-4 text-primary" />
              <span>Trusted community</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo + tagline -- shown below lg */}
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            {!logoError ? (
              <Image
                src="/images/vanderpump-dogs-logo.png"
                alt="Vanderpump Dogs Foundation - Volunteer Portal"
                width={220}
                height={110}
                className="h-auto w-full max-w-[220px] object-contain"
                priority
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <h1 className="text-2xl font-bold text-primary">Vanderpump Dogs</h1>
                <p className="text-sm text-muted-foreground">Volunteer Portal</p>
              </div>
            )}
          </div>

          {/* Desktop heading -- hidden on mobile */}
          <div className="mb-8 hidden lg:block">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="mt-1 text-muted-foreground leading-relaxed">
              Sign in to your volunteer account
            </p>
          </div>

          {/* Mobile heading */}
          <div className="mb-6 text-center lg:hidden">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Sign in to your account</h1>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <p className="font-medium">{error}</p>
                {error.includes("password") && (
                  <p className="mt-2 text-sm">
                    Need help?{" "}
                    <Link href="/auth/forgot" className="font-medium underline">
                      Reset your password
                    </Link>
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
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
                className="h-12 text-base bg-card border-border placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <Link
                  href="/auth/forgot"
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="h-12 pr-11 text-base bg-card border-border"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">New to volunteering?</span>
            </div>
          </div>

          {/* Signup CTA */}
          <Button asChild variant="outline" className="w-full h-12 text-base font-medium border-border">
            <Link href="/auth/signup">Create an account</Link>
          </Button>

          {/* Feature pills -- mobile only */}
          <div className="mt-8 flex flex-wrap justify-center gap-2 lg:hidden">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
              <CalendarDays className="h-3 w-3" />
              Easy scheduling
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
              <Heart className="h-3 w-3" />
              Help rescued dogs
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
              <Shield className="h-3 w-3" />
              Safe & secure
            </span>
          </div>

          {/* Footer links */}
          <div className="mt-8 flex items-center justify-between text-sm text-muted-foreground/80">
            <span className="font-medium">v 1.6.2</span>
            <Link href="/about" className="font-medium underline underline-offset-4 decoration-muted-foreground/40 hover:text-foreground hover:decoration-foreground transition-colors">
              About
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
