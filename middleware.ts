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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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
  } catch (error: any) {
    // If we get a session error (403), treat it as no user
    // This happens during sign-out when cookies are in transition
    user = null
  }

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    // Check admin role
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/volunteer", request.url))
    }
  }

  const protectedRoutes = ["/calendar", "/my-schedule", "/profile", "/volunteer"]
  if (protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
  }

  const securityHeaders = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' data:; connect-src 'self' https: wss:;",
    'Permissions-Policy': "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  }

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

export const config = {
  matcher: ["/admin/:path*", "/calendar/:path*", "/my-schedule/:path*", "/profile/:path*", "/volunteer/:path*"],
}
