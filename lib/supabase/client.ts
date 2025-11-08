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
 * @returns {SupabaseClient} The singleton Supabase client instance
 */
export function createClient() {
  // Check if we already have a client instance
  if (clientInstance) {
    return clientInstance
  }

  // Create new instance only if one doesn't exist
  clientInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  return clientInstance
}
