/**
 * Security utilities for input validation and sanitization
 */

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validates that a string is a valid UUID
 */
export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id)
}

/**
 * Sanitize text input - removes potential XSS vectors
 */
export function sanitizeText(input: string, maxLength = 255): string {
  if (!input) return ""
  return input
    .replace(/[<>]/g, "") // Remove HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim()
    .slice(0, maxLength)
}

/**
 * Sanitize phone number - only allows digits and formatting chars
 */
export function sanitizePhone(input: string): string {
  if (!input) return ""
  return input
    .replace(/[^\d\s\-$$$$+.]/g, "")
    .trim()
    .slice(0, 20)
}

/**
 * Sanitize email - lowercase and trim
 */
export function sanitizeEmail(input: string): string {
  if (!input) return ""
  return input.toLowerCase().trim().slice(0, 255)
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters")
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain an uppercase letter")
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain a lowercase letter")
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain a number")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate shift ID array
 */
export function validateShiftIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return []
  return ids.filter((id): id is string => typeof id === "string" && isValidUUID(id))
}

/**
 * Rate limit key generator
 */
export function getRateLimitKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`
}

/**
 * Check if string contains potential SQL injection
 */
export function hasSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
    /(--|\*\/|\/\*)/,
    /(\bOR\b|\bAND\b).*=/i,
    /['"`;]/,
  ]

  return sqlPatterns.some((pattern) => pattern.test(input))
}

/**
 * Escape HTML entities
 */
export function escapeHTML(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return input.replace(/[&<>"']/g, (char) => map[char])
}
