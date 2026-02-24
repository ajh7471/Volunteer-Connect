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

function NavLink({ href, label, onClick, mobile }: { href: string; label: string; onClick?: () => void; mobile?: boolean }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== "/" && pathname.startsWith(href))
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "font-medium transition-colors rounded-md",
        mobile ? "flex items-center px-4 py-3 text-base min-h-[44px]" : "px-3 py-2 text-sm",
        active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
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
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            href={userId ? (role === "admin" ? "/admin" : "/volunteer") : "/"}
            className="text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors"
          >
            Volunteer Connect
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
          <div className="hidden items-center gap-3 md:flex">
            {loading || signingOut ? (
              <span className="text-sm text-muted-foreground">{signingOut ? "Signing out..." : "Loading..."}</span>
            ) : userId ? (
              <Button onClick={signOut} variant="outline" size="sm" disabled={signingOut} className="font-medium">
                Sign Out
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="font-medium">
                  <Link href="/">Login</Link>
                </Button>
                <Button asChild variant="default" size="sm" className="font-medium shadow-lg shadow-primary/20">
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="font-medium">
                  <Link href="/about">About</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="flex h-11 w-11 items-center justify-center rounded-md md:hidden hover:bg-accent/50 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="flex flex-col gap-1 border-t border-primary/10 py-4 md:hidden">
            {userId && role === "volunteer" && (
              <NavLink href="/volunteer" label="Dashboard" onClick={() => setMobileMenuOpen(false)} mobile />
            )}
            {userId && <NavLink href="/calendar" label="Calendar" onClick={() => setMobileMenuOpen(false)} mobile />}
            {userId && <NavLink href="/my-schedule" label="My Schedule" onClick={() => setMobileMenuOpen(false)} mobile />}
            {userId && <NavLink href="/profile" label="Profile" onClick={() => setMobileMenuOpen(false)} mobile />}
            {role === "admin" && <NavLink href="/admin" label="Admin" onClick={() => setMobileMenuOpen(false)} mobile />}
            <div className="mt-3 flex flex-col gap-2 border-t border-primary/10 pt-3">
              {userId ? (
                <Button onClick={signOut} variant="outline" className="w-full min-h-[44px] font-medium" disabled={signingOut}>
                  {signingOut ? "Signing out..." : "Sign Out"}
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" className="w-full min-h-[44px] font-medium">
                    <Link href="/">Login</Link>
                  </Button>
                  <Button asChild variant="default" className="w-full min-h-[44px] font-medium shadow-lg shadow-primary/20">
                    <Link href="/auth/signup">Sign Up</Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full min-h-[44px] font-medium">
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
