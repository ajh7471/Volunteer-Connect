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

    // Use sendBeacon for reliable logout on page close
    if (sessionToken && navigator.sendBeacon) {
      const data = JSON.stringify({ sessionToken, reason: "browser_close" })
      const blob = new Blob([data], { type: "application/json" })
      navigator.sendBeacon(logoutEndpoint, blob)
    }

    // NOTE: We intentionally do NOT call event.preventDefault() or set event.returnValue
    // This would trigger the browser's "Leave site?" dialog which we don't want
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

    if (sessionToken && navigator.sendBeacon) {
      const data = JSON.stringify({ sessionToken, reason: "page_hide" })
      const blob = new Blob([data], { type: "application/json" })
      navigator.sendBeacon(logoutEndpoint, blob)
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

// Utility to perform logout via fetch (for manual logout)
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
      keepalive: true, // Allows request to complete even if page is closing
    })

    return response.ok
  } catch (error) {
    console.error("[Session] Logout request failed:", error)
    return false
  }
}
