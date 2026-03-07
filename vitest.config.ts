import { defineConfig } from "vitest/config"
import path from "path"

const ROOT = "/"

export default defineConfig({
  root: ROOT,
  test: {
    globals: true,
    environment: "node",
    root: ROOT,
    // Provide stub env vars so any transitive import of lib/supabase/config
    // (before mocks are applied) doesn't throw at module evaluation time.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.stub",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-stub-key",
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.stub",
    },
    // Reset modules between test files so the config singleton cache is cleared
    isolate: true,
    setupFiles: ["/__tests__/setup.ts"],
    include: ["/__tests__/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/scripts/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts", "app/admin/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
    },
  },
  resolve: {
    alias: {
      "@": ROOT,
    },
  },
})
