import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Store the client instance globally to ensure only one client is created
let clientInstance: ReturnType<typeof createSupabaseClient> | null = null

/**
 * Creates or returns the existing Supabase browser client
 * Uses sessionStorage for session-only persistence (cleared on browser close)
 */
export function createClient() {
  if (typeof window !== "undefined") {
    const globalWindow = window as typeof window & { __supabaseClient?: ReturnType<typeof createSupabaseClient> }
    if (globalWindow.__supabaseClient) {
      return globalWindow.__supabaseClient
    }
  }

  if (clientInstance) {
    return clientInstance
  }

  clientInstance = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    },
  )

  if (typeof window !== "undefined") {
    const globalWindow = window as typeof window & { __supabaseClient?: ReturnType<typeof createSupabaseClient> }
    globalWindow.__supabaseClient = clientInstance
  }

  return clientInstance
}

export function resetClient() {
  clientInstance = null
  if (typeof window !== "undefined") {
    const globalWindow = window as typeof window & { __supabaseClient?: ReturnType<typeof createSupabaseClient> }
    delete globalWindow.__supabaseClient
  }
}
