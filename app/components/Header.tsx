"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useSessionRole } from "@/lib/useSession"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { useState } from "react"

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isHomePage = pathname === "/"

  console.log("[v0] Header render - userId:", userId, "role:", role, "loading:", loading)

  const signOut = async () => {
    console.log("[v0] Header: Starting sign out...")
    await supabase.auth.signOut()
    console.log("[v0] Header: Sign out complete, redirecting...")
    r.push("/auth/login")
    r.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-foreground">
            Volunteer Connect
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {!userId && !isHomePage && <NavLink href="/" label="Home" />}
            {!userId && (
              <>
                <NavLink href="/#about" label="About" />
                <NavLink href="/#services" label="Services" />
                <NavLink href="/#contact" label="Contact" />
              </>
            )}
            {userId && role === "volunteer" && <NavLink href="/volunteer" label="Dashboard" />}
            {userId && <NavLink href="/calendar" label="Calendar" />}
            {userId && <NavLink href="/my-schedule" label="My Schedule" />}
            {userId && <NavLink href="/profile" label="Profile" />}
            {role === "admin" && <NavLink href="/admin" label="Admin" />}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden items-center gap-2 md:flex">
            {loading ? (
              <span className="text-sm text-muted-foreground">Loading...</span>
            ) : userId ? (
              <Button onClick={signOut} variant="default" size="sm">
                Sign Out
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button asChild variant="default" size="sm">
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="flex flex-col gap-2 py-4 md:hidden">
            {!userId && !isHomePage && <NavLink href="/" label="Home" onClick={() => setMobileMenuOpen(false)} />}
            {!userId && (
              <>
                <NavLink href="/#about" label="About" onClick={() => setMobileMenuOpen(false)} />
                <NavLink href="/#services" label="Services" onClick={() => setMobileMenuOpen(false)} />
                <NavLink href="/#contact" label="Contact" onClick={() => setMobileMenuOpen(false)} />
              </>
            )}
            {userId && role === "volunteer" && (
              <NavLink href="/volunteer" label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
            )}
            {userId && <NavLink href="/calendar" label="Calendar" onClick={() => setMobileMenuOpen(false)} />}
            {userId && <NavLink href="/my-schedule" label="My Schedule" onClick={() => setMobileMenuOpen(false)} />}
            {userId && <NavLink href="/profile" label="Profile" onClick={() => setMobileMenuOpen(false)} />}
            {role === "admin" && <NavLink href="/admin" label="Admin" onClick={() => setMobileMenuOpen(false)} />}
            <div className="mt-2 flex flex-col gap-2">
              {userId ? (
                <Button onClick={signOut} variant="default" size="sm" className="w-full">
                  Sign Out
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link href="/auth/login">Login</Link>
                  </Button>
                  <Button asChild variant="default" size="sm" className="w-full">
                    <Link href="/auth/signup">Sign Up</Link>
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
