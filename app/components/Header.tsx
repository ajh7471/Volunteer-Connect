"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useSessionRole } from "@/lib/useSession"
import { useSession } from "@/lib/session/session-provider"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== "/" && pathname.startsWith(href))
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent",
      ].join(" ")}
    >
      {label}
    </Link>
  )
}

export default function Header() {
  const r = useRouter()
  const { userId, role, loading } = useSessionRole()
  const { logout: sessionLogout } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const { toast } = useToast()

  const signOut = async () => {
    setSigningOut(true)

    try {
      await sessionLogout("manual_logout")

      const { error } = await supabase.auth.signOut({ scope: "global" })

      if (error) {
        console.error("Supabase sign out error:", error)
      }

      if (typeof window !== "undefined") {
        try {
          sessionStorage.clear()
          localStorage.removeItem("volunteer-hub-cache")
          const keysToRemove: string[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (key.includes("supabase") || key.includes("sb-") || key.includes("vh_"))) {
              keysToRemove.push(key)
            }
          }
          keysToRemove.forEach((key) => localStorage.removeItem(key))
        } catch (storageError) {
          console.error("Storage cleanup error:", storageError)
        }
      }

      window.location.href = "/"
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to sign out. Please try again."
      console.error("Sign out error:", error)
      setSigningOut(false)

      toast({
        title: "Sign out failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            href={userId ? (role === "admin" ? "/admin" : "/volunteer") : "/"}
            className="text-xl font-bold text-foreground"
          >
            Volunteer Hub
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {userId && role === "volunteer" && <NavLink href="/volunteer" label="Dashboard" />}
            {userId && <NavLink href="/calendar" label="Calendar" />}
            {userId && <NavLink href="/my-schedule" label="My Schedule" />}
            {userId && <NavLink href="/profile" label="Profile" />}
            {role === "admin" && <NavLink href="/admin" label="Admin" />}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden items-center gap-2 md:flex">
            {loading || signingOut ? (
              <span className="text-sm text-muted-foreground">{signingOut ? "Signing out..." : "Loading..."}</span>
            ) : userId ? (
              <Button onClick={signOut} variant="default" size="sm" disabled={signingOut}>
                Sign Out
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/">Login</Link>
                </Button>
                <Button asChild variant="default" size="sm">
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/about">About</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="flex flex-col gap-2 py-4 md:hidden">
            {userId && role === "volunteer" && (
              <NavLink href="/volunteer" label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
            )}
            {userId && <NavLink href="/calendar" label="Calendar" onClick={() => setMobileMenuOpen(false)} />}
            {userId && <NavLink href="/my-schedule" label="My Schedule" onClick={() => setMobileMenuOpen(false)} />}
            {userId && <NavLink href="/profile" label="Profile" onClick={() => setMobileMenuOpen(false)} />}
            {role === "admin" && <NavLink href="/admin" label="Admin" onClick={() => setMobileMenuOpen(false)} />}
            <div className="mt-2 flex flex-col gap-2">
              {userId ? (
                <Button onClick={signOut} variant="default" size="sm" className="w-full" disabled={signingOut}>
                  {signingOut ? "Signing out..." : "Sign Out"}
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link href="/">Login</Link>
                  </Button>
                  <Button asChild variant="default" size="sm" className="w-full">
                    <Link href="/auth/signup">Sign Up</Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link href="/about">About</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
