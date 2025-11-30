import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Middleware auth error:", error)
    user = null
  }

  const { pathname } = request.nextUrl

  if (!user && (pathname === "/" || pathname.startsWith("/auth"))) {
    // Clear any stale auth cookies to prevent stuck states
    const authCookies = request.cookies.getAll().filter((c) => c.name.includes("sb-") || c.name.includes("supabase"))
    authCookies.forEach((cookie) => {
      response.cookies.delete(cookie.name)
    })

    // Add security headers and return
    addSecurityHeaders(response)
    return response
  }

  // Redirect authenticated users away from login pages
  if (user && (pathname === "/" || pathname.startsWith("/auth"))) {
    try {
      // Check role to determine destination
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profileError) {
        console.error("Profile fetch error:", profileError)
        // Default to volunteer if profile fetch fails
        return NextResponse.redirect(new URL("/volunteer", request.url))
      }

      const destination = profile?.role === "admin" ? "/admin" : "/volunteer"
      return NextResponse.redirect(new URL(destination, request.url))
    } catch (error) {
      console.error("Redirect error:", error)
      return NextResponse.redirect(new URL("/volunteer", request.url))
    }
  }

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url))
    }

    try {
      // Check admin role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profileError || profile?.role !== "admin") {
        return NextResponse.redirect(new URL("/volunteer", request.url))
      }
    } catch (error) {
      console.error("Admin check error:", error)
      return NextResponse.redirect(new URL("/volunteer", request.url))
    }
  }

  const protectedRoutes = ["/calendar", "/my-schedule", "/profile", "/volunteer"]
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  addSecurityHeaders(response)

  return response
}

function addSecurityHeaders(response: NextResponse) {
  const securityHeaders = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "1; mode=block",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Removed unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Cross-Origin-Embedder-Policy": "credentialless",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  }

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (web manifest)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json).*)",
  ],
}
