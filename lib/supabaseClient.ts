import { createClient } from "./supabase/client"

// Create a singleton instance to prevent "Multiple GoTrueClient instances" warning
let clientInstance: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!clientInstance) {
    console.log("[v0] Creating Supabase client singleton instance")
    clientInstance = createClient()
  }
  return clientInstance
}

// Export singleton for use throughout the app
export const supabase = getSupabase()
