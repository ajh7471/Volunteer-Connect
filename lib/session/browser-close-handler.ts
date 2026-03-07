// Browser Close and Tab Close Detection

interface BrowserCloseHandlerOptions {
  onBeforeUnload: () => void
  onVisibilityChange: (isVisible: boolean) => void
  logoutEndpoint: string
  sessionToken: string | null
}

export function createBrowserCloseHandler(options: BrowserCloseHandlerOptions) {
  const { onBeforeUnload, onVisibilityChange, logoutEndpoint, sessionToken } = options

  let isUnloading = false

  const handleBeforeUnload = () => {
    isUnloading = true
    onBeforeUnload()

    // Clear client-side storage before sending logout beacon
    // This ensures the user must login again even if logout fails
    try {
      if (typeof window !== "undefined") {
        sessionStorage.clear()
        // Clear all auth-related localStorage
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (
            key &&
            (key.includes("supabase") || key.includes("sb-") || key.includes("vh_") || key.includes("volunteer-hub"))
          ) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key))
      }
    } catch {
      // Silently ignore storage errors
    }

    // Use sendBeacon for reliable logout on page close.
    // Wrapped in try/catch to prevent "Load failed" errors in WebKit/Safari.
    if (sessionToken && typeof navigator !== "undefined" && navigator.sendBeacon) {
      try {
        const data = JSON.stringify({ sessionToken, reason: "browser_close" })
        const blob = new Blob([data], { type: "application/json" })
        navigator.sendBeacon(logoutEndpoint, blob)
      } catch {
        // sendBeacon can throw in some environments -- ignore
      }
    }
  }

  const handleVisibilityChange = () => {
    if (isUnloading) return

    const isVisible = document.visibilityState === "visible"
    onVisibilityChange(isVisible)
  }

  const handlePageHide = (event: PageTransitionEvent) => {
    // pagehide is more reliable than beforeunload in some browsers
    if (event.persisted) {
      // Page is being cached (bfcache), don't logout
      return
    }

    // Clear client-side storage on page hide
    try {
      if (typeof window !== "undefined") {
        sessionStorage.clear()
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (
            key &&
            (key.includes("supabase") || key.includes("sb-") || key.includes("vh_") || key.includes("volunteer-hub"))
          ) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key))
      }
    } catch {
      // Silently ignore storage errors
    }

    // Only fire sendBeacon for true page unloads, not SPA navigations.
    // Wrapped in try/catch to prevent "Load failed" errors in WebKit/Safari.
    if (isUnloading && sessionToken && typeof navigator !== "undefined" && navigator.sendBeacon) {
      try {
        const data = JSON.stringify({ sessionToken, reason: "page_hide" })
        const blob = new Blob([data], { type: "application/json" })
        navigator.sendBeacon(logoutEndpoint, blob)
      } catch {
        // sendBeacon can throw in some environments -- ignore
      }
    }
  }

  const start = () => {
    if (typeof window === "undefined") return

    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("pagehide", handlePageHide)
    document.addEventListener("visibilitychange", handleVisibilityChange)
  }

  const stop = () => {
    if (typeof window === "undefined") return

    window.removeEventListener("beforeunload", handleBeforeUnload)
    window.removeEventListener("pagehide", handlePageHide)
    document.removeEventListener("visibilitychange", handleVisibilityChange)
  }

  return {
    start,
    stop,
  }
}

// Utility to perform logout via fetch (for manual logout).
// Does NOT use keepalive to avoid "Load failed" errors in Safari/WebKit.
// For page-close scenarios, sendBeacon (above) is used instead.
export async function performLogout(
  logoutEndpoint: string,
  sessionToken: string,
  reason = "manual_logout",
): Promise<boolean> {
  try {
    const response = await fetch(logoutEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionToken, reason }),
    })

    return response.ok
  } catch {
    // Network errors (including "Load failed" in WebKit) are silently ignored
    // since the session will expire server-side anyway.
    return false
  }
}
