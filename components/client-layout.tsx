"use client"

import type React from "react"
import { usePathname } from 'next/navigation'
import Header from "@/app/components/Header"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Skip header and breadcrumb on authentication pages for faster load
  // Also skip on the root page (login)
  const isAuthPage = pathname === "/" || pathname?.startsWith("/auth")

  return (
    <>
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
    </>
  )
}
