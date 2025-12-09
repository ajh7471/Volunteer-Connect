import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabaseConfig, isSupabaseConfigured } from "./config"

/**
 * Creates a Supabase server client with validated configuration
 * Handles cookies for authentication state management
 *
 * IMPORTANT: Do not put this client in a global variable.
 * Always create a new client within each function (especially important for Fluid compute)
 *
 * @throws {SupabaseConfigError} If required environment variables are missing
 */
export async function createClient() {
  // Validate configuration before creating client
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not properly configured. Please check your environment variables.")
  }

  const config = getSupabaseConfig()
  const cookieStore = await cookies()

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}

export { createClient as createServerClient }
