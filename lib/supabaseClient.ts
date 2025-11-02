import { createBrowserClient } from "@supabase/ssr"
import { ENV } from "./env"

export const supabase = createBrowserClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON)
