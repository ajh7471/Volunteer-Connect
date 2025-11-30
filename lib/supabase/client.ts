import { createBrowserClient } from "@supabase/ssr"

// Store the client instance globally to ensure only one client is created
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

/**
 * Creates or returns the existing Supabase browser client
 *
 * This function implements the singleton pattern to ensure only one Supabase client
 * instance exists throughout the application lifecycle. Creating multiple instances
 * can cause "Multiple GoTrueClient instances" warnings and unpredictable behavior.
 *
 * Configure session storage to use sessionStorage instead of localStorage
 * This ensures sessions are cleared when the browser window is closed
 *
 * @returns {SupabaseClient} The singleton Supabase client instance
 */
export function createClient() {
  if (typeof window !== "undefined") {
    // Check if instance exists on window for cross-module singleton
    const globalWindow = window as typeof window & { __supabaseClient?: ReturnType<typeof createBrowserClient> }
    if (globalWindow.__supabaseClient) {
      return globalWindow.__supabaseClient
    }
  }

  // Check module-level singleton
  if (clientInstance) {
    return clientInstance
  }

  // Create new instance with sessionStorage for session-only persistence
  clientInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Use sessionStorage so session expires when browser closes
        storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
        // Automatically refresh tokens before they expire
        autoRefreshToken: true,
        // Persist session in storage
        persistSession: true,
        // Detect session from URL (for OAuth callbacks)
        detectSessionInUrl: true,
        // Flow type for PKCE
        flowType: "pkce",
      },
    },
  )

  if (typeof window !== "undefined") {
    const globalWindow = window as typeof window & { __supabaseClient?: ReturnType<typeof createBrowserClient> }
    globalWindow.__supabaseClient = clientInstance
  }

  return clientInstance
}

/**
 * Reset the client instance (useful for testing or forced re-initialization)
 */
export function resetClient() {
  clientInstance = null
  if (typeof window !== "undefined") {
    const globalWindow = window as typeof window & { __supabaseClient?: ReturnType<typeof createBrowserClient> }
    delete globalWindow.__supabaseClient
  }
}
