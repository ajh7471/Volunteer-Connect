import { createClient } from "./supabase/client"

/**
 * EDUCATIONAL COMMENT - Supabase Client Export
 *
 * This file provides a convenient way to import the Supabase client
 * throughout the application. Instead of calling createClient() everywhere,
 * we export a pre-created instance that all components can share.
 *
 * USAGE:
 * import { supabase } from "@/lib/supabaseClient"
 * const { data } = await supabase.from('profiles').select()
 *
 * WHY THIS PATTERN:
 * - Consistent import path across the app
 * - No need to call createClient() manually in every file
 * - The singleton pattern in createClient() ensures only one instance
 *
 * @test-scope: client-export, import-consistency
 */

// Create and export the singleton instance
// This line executes once when the module is first imported
export const supabase = createClient()
