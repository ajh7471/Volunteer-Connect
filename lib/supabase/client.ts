import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseConfig, isSupabaseConfigured } from "./config"

// Store the client instance globally to ensure only one client is created
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

/**
 * Creates a Supabase browser client with validated configuration
 * Uses singleton pattern to maintain one client instance per browser session
 *
 * @throws {SupabaseConfigError} If required environment variables are missing
 */
export function createClient() {
  // Validate configuration before creating client
  if (!isSupabaseConfigured()) {
    console.warn("[v0] Supabase is not configured. Auth features will be unavailable.")
    // Return a no-op client stub so the app renders rather than throwing
    if (clientInstance) return clientInstance
  }

  const config = getSupabaseConfig()

  if (clientInstance) {
    return clientInstance
  }

  // Detect if running in an iframe (v0 preview, embedded apps)
  const isIframe = typeof window !== "undefined" && window.self !== window.top

  clientInstance = createBrowserClient(config.url, config.anonKey, {
    auth: {
      // Use sessionStorage for auth tokens instead of localStorage.
      // This ensures tokens are cleared when the browser/tab closes,
      // forcing users to re-login on each visit.
      ...(typeof window !== "undefined"
        ? {
            storage: {
              getItem: (key: string) => {
                try {
                  return sessionStorage.getItem(key)
                } catch {
                  return null
                }
              },
              setItem: (key: string, value: string) => {
                try {
                  sessionStorage.setItem(key, value)
                } catch {
                  // Silently ignore storage errors
                }
              },
              removeItem: (key: string) => {
                try {
                  sessionStorage.removeItem(key)
                } catch {
                  // Silently ignore storage errors
                }
              },
            },
          }
        : {}),
      // Disable auto-refresh in iframe environments to prevent "Load failed"
      // errors from background token refresh requests in WebKit sandboxes.
      autoRefreshToken: !isIframe,
      // Bypass navigator.locks to prevent "LockManager lock timed out" errors
      // in iframe environments (v0 preview, embedded apps). The lock is used to
      // synchronize token refresh across tabs, but causes deadlocks in sandboxed
      // contexts where navigator.locks.request() never resolves.
      // See: https://github.com/supabase/supabase-js/issues/1594
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => {
        return await fn()
      },
    },
  })

  if (typeof window !== "undefined") {
    const globalWindow = window as typeof window & { __supabaseClient?: ReturnType<typeof createBrowserClient> }
    globalWindow.__supabaseClient = clientInstance
  }

  return clientInstance
}

export function resetClient() {
  clientInstance = null
  if (typeof window !== "undefined") {
    const globalWindow = window as typeof window & { __supabaseClient?: ReturnType<typeof createBrowserClient> }
    delete globalWindow.__supabaseClient
  }
}
