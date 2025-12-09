/**
 * Server-side admin client with elevated privileges
 * Uses service role key for admin operations
 *
 * SECURITY WARNING: Only use this in server-side code (API routes, server actions)
 * NEVER expose the service role key to the client
 */
import { createClient } from "@supabase/supabase-js"
import { getSupabaseConfig } from "./config"

let adminClientInstance: ReturnType<typeof createClient> | null = null

/**
 * Creates or returns a Supabase admin client with service role privileges
 * Use this for server-side operations that require elevated permissions
 *
 * @throws {Error} If service role key is not configured
 */
export function createAdminClient() {
  const config = getSupabaseConfig()

  if (!config.serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured.\n" +
        "This is required for admin operations.\n" +
        "Find this value at: https://supabase.com/dashboard/project/_/settings/api",
    )
  }

  // Reuse singleton instance to avoid creating multiple connections
  if (adminClientInstance) {
    return adminClientInstance
  }

  adminClientInstance = createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClientInstance
}

/**
 * Checks if admin client is available (service role key is configured)
 */
export function isAdminClientAvailable(): boolean {
  try {
    const config = getSupabaseConfig()
    return !!config.serviceRoleKey
  } catch {
    return false
  }
}
