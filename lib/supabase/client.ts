import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseConfig, isSupabaseConfigured } from "./config"

// Store the client instance globally to ensure only one client is created
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

/**
 * Creates a Supabase browser client with validated configuration.
 * Uses singleton pattern to maintain one client instance per browser session.
 *
 * IMPORTANT: Do NOT override the auth storage. @supabase/ssr manages auth
 * state via cookies that are kept in sync by the server middleware. Overriding
 * storage (e.g. with sessionStorage) breaks this contract and causes the client
 * to call _getUser() over the network on every page load, which can fail with
 * "Failed to fetch" when the network is slow or unavailable.
 */
export function createClient() {
  if (!isSupabaseConfigured()) {
    console.warn("[v0] Supabase is not configured. Auth features will be unavailable.")
    if (clientInstance) return clientInstance
  }

  if (clientInstance) {
    return clientInstance
  }

  const config = getSupabaseConfig()

  clientInstance = createBrowserClient(config.url, config.anonKey, {
    auth: {
      // Do NOT auto-refresh tokens in the browser client. Token refresh requires
      // a network call to _getUser() which is the direct cause of the "Failed to
      // fetch" / auth timeout errors in production. The middleware (server-side)
      // is responsible for refreshing the session cookie on each request instead.
      autoRefreshToken: false,
      // Bypass navigator.locks to prevent "LockManager lock timed out" errors
      // in iframe environments. The lock synchronises token refresh across tabs
      // but can deadlock in sandboxed contexts.
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
