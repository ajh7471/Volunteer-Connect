/**
 * Supabase Configuration Management
 *
 * Securely manages Supabase environment variables with validation and error handling.
 * Suitable for Vercel and other runtime environments.
 */

export interface SupabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey?: string
}

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SupabaseConfigError"
  }
}

/**
 * Validates that required environment variables are present and properly formatted
 */
function validateEnvironmentVariables(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Check for required variables
  if (!url || !anonKey) {
    const missing: string[] = []
    if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL")
    if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    throw new SupabaseConfigError(
      `Missing required Supabase environment variables: ${missing.join(", ")}\n\n` +
        `Please ensure these are set in your environment or .env file:\n` +
        `- NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL\n` +
        `- NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anonymous key\n\n` +
        `Find these values at: https://supabase.com/dashboard/project/_/settings/api`,
    )
  }

  // Validate URL format
  try {
    new URL(url)
  } catch {
    throw new SupabaseConfigError(
      `Invalid NEXT_PUBLIC_SUPABASE_URL: "${url}"\n` +
        `Expected a valid URL format (e.g., https://your-project.supabase.co)`,
    )
  }

  // Validate URL is a Supabase URL
  if (!url.includes("supabase.co") && !url.includes("localhost")) {
    console.warn(
      `[Supabase Config] URL does not appear to be a Supabase URL: ${url}\n` + `This may cause connection issues.`,
    )
  }

  // Validate key format (basic check for JWT structure)
  if (anonKey.length < 100 || !anonKey.includes(".")) {
    console.warn(
      `[Supabase Config] NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be invalid.\n` + `Expected a JWT token format.`,
    )
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
  }
}

// Cache both success and failure to avoid re-validating on every request
let cachedConfig: SupabaseConfig | null = null
let validationAttempted = false

/**
 * Gets the validated Supabase configuration.
 * Caches the result (or failure) to avoid repeated validation on every request.
 */
export function getSupabaseConfig(): SupabaseConfig {
  if (!validationAttempted) {
    validationAttempted = true
    try {
      cachedConfig = validateEnvironmentVariables()
    } catch (error) {
      cachedConfig = null
      throw error
    }
  }
  if (!cachedConfig) {
    throw new SupabaseConfigError(
      "Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY",
    )
  }
  return cachedConfig
}

/**
 * Checks if Supabase is properly configured
 * Returns true if all required variables are present and valid
 */
export function isSupabaseConfigured(): boolean {
  try {
    getSupabaseConfig()
    return true
  } catch {
    return false
  }
}

/**
 * Gets configuration with graceful degradation
 * Returns null if configuration is invalid instead of throwing
 */
export function getSupabaseConfigSafe(): SupabaseConfig | null {
  try {
    return getSupabaseConfig()
  } catch {
    // Silently return null — callers are responsible for handling missing config.
    // The middleware will gracefully degrade rather than hard-crash the request.
    return null
  }
}

/**
 * Resets the cached configuration.
 * Useful for testing or when environment variables change at runtime.
 */
export function resetSupabaseConfig(): void {
  cachedConfig = null
  validationAttempted = false
}
