import { createBrowserClient } from "@supabase/ssr"

// Singleton pattern for Supabase client
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return supabaseInstance
}

// Export for backwards compatibility
export const supabase = getSupabase()
