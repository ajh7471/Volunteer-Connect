"use client"

import { usePathname, useParams } from 'next/navigation'
import Link from "next/link"
import { ChevronRight, Home } from 'lucide-react'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type BreadcrumbItem = {
  label: string
  href: string
  active?: boolean
}

export function BreadcrumbNav() {
  const pathname = usePathname()
  const params = useParams()
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    // Load dynamic labels for IDs in the URL
    async function loadDynamicData() {
      if (params.id && typeof params.id === "string") {
        if (pathname.includes("/admin/volunteers/")) {
          console.log("[v0] Breadcrumb: Loading email for volunteer ID:", params.id)
          const { data, error } = await supabase.from("profiles").select("email, name").eq("id", params.id).single()
          console.log("[v0] Breadcrumb: Query result:", { data, error })
          
          if (data?.email) {
            setDynamicLabels((prev) => ({ ...prev, [params.id as string]: data.email }))
          } else if (data?.name) {
            // Fallback to name if email is not available
            setDynamicLabels((prev) => ({ ...prev, [params.id as string]: data.name }))
          }
        }
      }
    }
    loadDynamicData()
  }, [pathname, params])

  // Skip breadcrumbs on certain pages
  if (
    pathname === "/" ||
    pathname === "/auth/login" ||
    pathname === "/auth/signup" ||
    !pathname ||
    pathname === "/404"
  ) {
    return null
  }

  const segments = pathname.split("/").filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: "Home",
      href: "/",
    },
  ]

  // Build breadcrumb trail
  let currentPath = ""
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1

    // Create human-readable labels
    let label = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")

    // Handle dynamic segments (IDs)
    if (segment === params.id && dynamicLabels[segment]) {
      label = dynamicLabels[segment]
    }

    // Custom labels for specific routes
    const customLabels: Record<string, string> = {
      "/admin": "Admin Dashboard",
      "/volunteer": "Dashboard",
      "/calendar": "Calendar",
      "/my-schedule": "My Schedule",
      "/profile": "Profile",
      "/admin/users": "User Management",
      "/admin/volunteers": "Volunteers",
      "/admin/shifts": "Shifts",
      "/admin/shift-templates": "Shift Templates",
      "/admin/swap-requests": "Swap Requests",
      "/admin/emails": "Email Communications",
      "/admin/reports": "Reports",
      "/admin/settings": "Settings",
      "/admin/settings/email-service": "Email Service",
      "/auth": "Authentication",
    }

    if (customLabels[currentPath]) {
      label = customLabels[currentPath]
    }

    breadcrumbs.push({
      label,
      href: currentPath,
      active: isLast,
    })
  })

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
      {breadcrumbs.map((item, index) => (
        <div key={item.href} className="flex items-center">
          {index > 0 && <ChevronRight className="mx-1 h-4 w-4 shrink-0" />}
          {item.active ? (
            <span className="font-medium text-foreground" aria-current="page">
              {item.label}
            </span>
          ) : (
            <Link href={item.href} className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
              {index === 0 && <Home className="h-4 w-4" />}
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
