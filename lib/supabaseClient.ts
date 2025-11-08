import { createClient } from "./supabase/client"

/**
 * Supabase Client Singleton Export
 *
 * This file provides a single point of access to the Supabase client throughout the app.
 * The actual singleton pattern is implemented in lib/supabase/client.ts to ensure
 * only one client instance is ever created, preventing the "Multiple GoTrueClient instances" warning.
 *
 * Usage:
 * import { supabase } from '@/lib/supabaseClient'
 * const { data, error } = await supabase.from('table').select()
 */

let _supabaseInstance: ReturnType<typeof createClient> | null = null

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    if (!_supabaseInstance) {
      _supabaseInstance = createClient()
    }
    return (_supabaseInstance as any)[prop]
  },
})

// Also export the create function for explicit usage
export { createClient }
