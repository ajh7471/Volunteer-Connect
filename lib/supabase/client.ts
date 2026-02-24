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
    throw new Error("Supabase is not properly configured. Please check your environment variables.")
  }

  const config = getSupabaseConfig()

  if (clientInstance) {
    return clientInstance
  }

  clientInstance = createBrowserClient(config.url, config.anonKey, {
    auth: {
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
