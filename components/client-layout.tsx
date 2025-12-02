"use client"

import type React from "react"
import { usePathname, useRouter } from "next/navigation"
import Header from "@/app/components/Header"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { SessionProvider } from "@/lib/session/session-provider"
import { SessionTimeoutWarning } from "@/components/session-timeout-warning"
import { useToast } from "@/hooks/use-toast"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  // Skip header and breadcrumb on authentication pages for faster load
  // Also skip on the root page (login)
  const isAuthPage = pathname === "/" || pathname?.startsWith("/auth")

  const handleSessionTimeout = () => {
    toast({
      title: "Session Expired",
      description: "Your session has expired due to inactivity. Please log in again.",
      variant: "destructive",
    })
    router.push("/")
  }

  const handleSessionEnd = (reason: string) => {
    if (reason === "logout_other_tab") {
      toast({
        title: "Signed Out",
        description: "You were signed out from another tab.",
      })
      router.push("/")
    }
  }

  return (
    <SessionProvider
      config={{
        idleTimeoutMinutes: 30,
        absoluteTimeoutHours: 8,
        heartbeatIntervalMinutes: 5,
        warnBeforeTimeoutMinutes: 5,
        logoutOnBrowserClose: true,
        syncLogoutAcrossTabs: true,
      }}
      onSessionTimeout={handleSessionTimeout}
      onSessionEnd={handleSessionEnd}
    >
      {!isAuthPage && <Header />}
      {!isAuthPage && (
        <div className="border-b bg-muted/30">
          <div className="container mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
            <BreadcrumbNav />
          </div>
        </div>
      )}
      <main className={!isAuthPage ? "container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8" : "min-h-dvh"}>
        {children}
      </main>
      <SessionTimeoutWarning />
    </SessionProvider>
  )
}
