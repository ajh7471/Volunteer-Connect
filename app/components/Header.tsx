"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useSessionRole } from "@/lib/useSession"
import { Button } from "@/components/ui/button"

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== "/" && pathname.startsWith(href))
  return (
    <Link
      href={href}
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

  const signOut = async () => {
    await supabase.auth.signOut()
    r.push("/auth/login")
  }

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto max-w-6xl flex items-center gap-2 py-3 px-4">
        <Link href="/" className="mr-4 text-lg font-semibold text-foreground">
          Volunteer Connect
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink href="/" label="Home" />
          <NavLink href="/calendar" label="Calendar" />
          {userId && <NavLink href="/my-schedule" label="My Schedule" />}
          {role === "admin" && <NavLink href="/admin" label="Admin" />}
        </nav>

        <div className="ml-auto flex items-center gap-2">
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
      </div>
    </header>
  )
}
