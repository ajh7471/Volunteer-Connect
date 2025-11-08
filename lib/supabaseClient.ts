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
export const supabase = createClient()
