/**
 * Global Vitest setup — runs before each test FILE.
 *
 * Resets the Supabase config singleton so that tests which mock
 * @/lib/supabase/config start from a clean state every time.
 *
 * Also ensures the stub env vars are present in case any transitive
 * import reads process.env directly before vi.mock() is applied.
 */

// Ensure stub env vars are available synchronously before any module loads
process.env.NEXT_PUBLIC_SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL    || "https://test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.stub"
process.env.SUPABASE_SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY   || "service-role-stub-key"
process.env.SUPABASE_URL                = process.env.SUPABASE_URL                || "https://test.supabase.co"
process.env.SUPABASE_ANON_KEY           = process.env.SUPABASE_ANON_KEY           || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.stub"

// Reset the cached config so each test file starts fresh.
// Dynamic import works because by the time this runs, vitest has already
// applied module isolation (isolate: true).
import("@/lib/supabase/config").then(({ resetSupabaseConfig }) => {
  if (typeof resetSupabaseConfig === "function") resetSupabaseConfig()
}).catch(() => {
  // Module may be mocked — that's fine.
})
