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
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
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

  const signOut = async () => {
    await supabase.auth.signOut()
    r.push("/auth/login")
  }

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between py-3">
          <Link href="/" className="text-lg font-semibold text-foreground">
            Volunteer Connect
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/" label="Home" />
            <NavLink href="/calendar" label="Calendar" />
            {userId && <NavLink href="/my-schedule" label="My Schedule" />}
            {role === "admin" && <NavLink href="/admin" label="Admin" />}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-2">
            {loading ? (
              <span className="text-sm text-muted-foreground">Loading...</span>
            ) : userId ? (
              <Button onClick={signOut} variant="default" size="sm">
                Sign out
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button asChild variant="default" size="sm">
                  <Link href="/auth/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-2">
            <nav className="flex flex-col space-y-1">
              <NavLink href="/" label="Home" onClick={closeMobileMenu} />
              <NavLink href="/calendar" label="Calendar" onClick={closeMobileMenu} />
              {userId && <NavLink href="/my-schedule" label="My Schedule" onClick={closeMobileMenu} />}
              {role === "admin" && <NavLink href="/admin" label="Admin" onClick={closeMobileMenu} />}
            </nav>
            <div className="pt-2 border-t flex flex-col gap-2">
              {loading ? (
                <span className="text-sm text-muted-foreground px-3">Loading...</span>
              ) : userId ? (
                <Button onClick={signOut} variant="default" size="sm" className="w-full">
                  Sign out
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link href="/auth/login">Login</Link>
                  </Button>
                  <Button asChild variant="default" size="sm" className="w-full">
                    <Link href="/auth/signup">Sign up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
