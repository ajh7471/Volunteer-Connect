const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anon) {
  // Fail fast in dev, log in prod
  if (process.env.NODE_ENV !== "production") {
    throw new Error("Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  } else {
    // eslint-disable-next-line no-console
    console.error("Missing Supabase env. Check v0 Environment Variables.")
  }
}

export const ENV = { SUPABASE_URL: url!, SUPABASE_ANON: anon! }
