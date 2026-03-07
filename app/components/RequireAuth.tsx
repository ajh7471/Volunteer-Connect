"use client"

import type React from "react"

/**
 * RequireAuth Component
 *
 * This component is a no-op wrapper that simply renders its children.
 * All authentication and route protection is handled by the server middleware,
 * which runs before any client code and redirects unauthenticated users to login.
 *
 * By the time this component renders on the client, the user is already
 * authenticated (or the middleware redirected them). This avoids redundant
 * client-side auth checks that cause timeouts in production.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  // Middleware has already verified authentication
  return <>{children}</>
}
