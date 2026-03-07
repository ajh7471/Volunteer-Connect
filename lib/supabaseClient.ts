import { createClient } from "./supabase/client"

/**
 * Supabase Client Singleton Export
 *
 * This file provides a single point of access to the Supabase client throughout the app.
 * The actual singleton pattern is implemented in lib/supabase/client.ts to ensure
 * only one client instance is ever created, preventing the "Multiple GoTrueClient instances" warning.
 *
 * Uses a lazy getter so the client is only created when first accessed, avoiding
 * "Load failed" errors caused by eager initialization during module evaluation in
 * WebKit iframe sandboxes (v0 preview).
 *
 * Usage:
 * import { supabase } from '@/lib/supabaseClient'
 * const { data, error } = await supabase.from('table').select()
 */
let _supabase: ReturnType<typeof createClient> | null = null

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop, receiver) {
    if (!_supabase) {
      _supabase = createClient()
    }
    const value = Reflect.get(_supabase, prop, receiver)
    if (typeof value === "function") {
      return value.bind(_supabase)
    }
    return value
  },
})
