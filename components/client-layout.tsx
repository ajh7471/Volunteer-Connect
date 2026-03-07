"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import Header from "@/app/components/Header"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { SessionProvider } from "@/lib/session/session-provider"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Skip header and breadcrumb on authentication pages for faster load
  // Also skip on the root page (login)
  const isAuthPage = pathname === "/" || pathname?.startsWith("/auth")

  const handleSessionTimeout = () => {
    // Silently redirect to login -- no warning dialog
    window.location.href = "/"
  }

  const handleSessionEnd = (reason: string) => {
    if (reason === "logout_other_tab" || reason === "timeout" || reason === "session_invalidated") {
      window.location.href = "/"
    }
  }

  return (
    <SessionProvider
      config={{
        idleTimeoutMinutes: 60,
        absoluteTimeoutHours: 12,
        heartbeatIntervalMinutes: 5,
        warnBeforeTimeoutMinutes: 0,
        logoutOnBrowserClose: true,
        syncLogoutAcrossTabs: true,
      }}
      onSessionTimeout={handleSessionTimeout}
      onSessionEnd={handleSessionEnd}
    >
      {!isAuthPage && <Header />}
      {!isAuthPage && (
        <div className="border-b border-primary/10 bg-background/50 backdrop-blur-sm">
          <div className="container mx-auto max-w-7xl px-4 py-2.5 sm:px-6 lg:px-8">
            <BreadcrumbNav />
          </div>
        </div>
      )}
      <main className={!isAuthPage ? "container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8" : ""}>
        {children}
      </main>
    </SessionProvider>
  )
}
