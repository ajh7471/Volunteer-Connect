import { createClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    },
  })

  // IMPORTANT: Do not run code between createServerClient and supabase.auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Allow unauthenticated access to login pages
  if (!user && (pathname === "/" || pathname.startsWith("/auth"))) {
    addSecurityHeaders(supabaseResponse)
    return supabaseResponse
  }

  // Redirect authenticated users away from login pages
  if (user && (pathname === "/" || pathname.startsWith("/auth"))) {
    try {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

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
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

      if (profile?.role !== "admin") {
        return NextResponse.redirect(new URL("/volunteer", request.url))
      }
    } catch (error) {
      console.error("Admin check error:", error)
      return NextResponse.redirect(new URL("/volunteer", request.url))
    }
  }

  // Protect other authenticated routes
  const protectedRoutes = ["/calendar", "/my-schedule", "/profile", "/volunteer"]
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  addSecurityHeaders(supabaseResponse)
  return supabaseResponse
}

function addSecurityHeaders(response: NextResponse) {
  const securityHeaders = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "1; mode=block",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' data:; connect-src 'self' https: wss:;",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  }

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|images).*)"],
}
