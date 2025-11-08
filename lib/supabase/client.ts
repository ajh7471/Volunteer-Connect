import { createBrowserClient } from "@supabase/ssr"

/**
 * EDUCATIONAL COMMENT - Supabase Client Singleton Pattern
 *
 * WHY WE NEED A SINGLETON:
 * - Supabase creates a GoTrueClient instance for authentication
 * - Multiple instances cause "Multiple GoTrueClient instances" warnings
 * - Can lead to undefined behavior with concurrent auth operations
 * - Wastes memory and resources by creating duplicate connections
 *
 * HOW THE SINGLETON WORKS:
 * - We store the client instance in a module-level variable (clientInstance)
 * - First call: creates the client and stores it
 * - Subsequent calls: returns the existing instance
 * - This ensures only ONE client exists for the entire application
 *
 * @test-scope: singleton-pattern, client-initialization
 */

// Module-level variable to store the single client instance
// null initially, set once on first access
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // If we already have a client, return it immediately
  if (clientInstance) {
    console.log("[v0] Reusing existing Supabase client instance")
    return clientInstance
  }

  // First time: create the client
  console.log("[v0] Creating NEW Supabase client singleton instance")

  // Create the browser client with environment variables
  // NEXT_PUBLIC_* variables are available in browser and server
  clientInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  return clientInstance
}
