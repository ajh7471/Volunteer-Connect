// Test Helper Functions for Admin Workflow Testing

import { createClient } from "@supabase/supabase-js"

/**
 * Test utilities for admin workflow validation
 */

// Initialize Supabase client for testing
export function getTestClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

// Test data generators
export const testData = {
  volunteers: [
    {
      email: "volunteer1@test.com",
      password: "TestPass123!",
      name: "Alice Johnson",
      phone: "555-0101",
      role: "volunteer",
    },
    {
      email: "volunteer2@test.com",
      password: "TestPass123!",
      name: "Bob Smith",
      phone: "555-0102",
      role: "volunteer",
    },
    {
      email: "volunteer3@test.com",
      password: "TestPass123!",
      name: "Carol Williams",
      phone: "555-0103",
      role: "volunteer",
    },
  ],
  admin: {
    email: "volunteer@vanderpumpdogs.org",
    password: "VolunteerAdmin2026",
    name: "Admin User",
    phone: "555-0100",
    role: "admin",
  },
}

// Verification functions
export async function verifyVolunteerExists(email: string): Promise<boolean> {
  const supabase = getTestClient()
  const { data, error } = await supabase.from("profiles").select("id").eq("id", email).single()

  return !error && !!data
}

export async function verifyShiftAssignment(shiftId: string, userId: string): Promise<boolean> {
  const supabase = getTestClient()
  const { data, error } = await supabase
    .from("shift_assignments")
    .select("id")
    .eq("shift_id", shiftId)
    .eq("user_id", userId)
    .single()

  return !error && !!data
}

export async function getShiftCapacityInfo(shiftId: string) {
  const supabase = getTestClient()

  // Get shift details
  const { data: shift } = await supabase.from("shifts").select("capacity").eq("id", shiftId).single()

  // Get current assignments
  const { data: assignments } = await supabase.from("shift_assignments").select("id").eq("shift_id", shiftId)

  return {
    capacity: shift?.capacity || 0,
    assigned: assignments?.length || 0,
    available: (shift?.capacity || 0) - (assignments?.length || 0),
  }
}

// Cleanup functions for testing
export async function cleanupTestVolunteers() {
  const supabase = getTestClient()
  const testEmails = testData.volunteers.map((v) => v.email)

  await supabase.from("profiles").delete().in("id", testEmails)
}

// Test assertion helpers
export function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message || ""}\nExpected: ${expected}\nActual: ${actual}`)
  }
}

export function assertTrue(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message || "Expected true, got false"}`)
  }
}

export function assertFalse(condition: boolean, message?: string) {
  if (condition) {
    throw new Error(`Assertion failed: ${message || "Expected false, got true"}`)
  }
}

// Performance testing
export async function measureOperationTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now()
  const result = await operation()
  const duration = Date.now() - start
  return { result, duration }
}

// Test report generation
export interface TestResult {
  testCase: string
  status: "pass" | "fail" | "blocked"
  duration: number
  error?: string
  screenshot?: string
}

export function generateTestReport(results: TestResult[]): string {
  const total = results.length
  const passed = results.filter((r) => r.status === "pass").length
  const failed = results.filter((r) => r.status === "fail").length
  const blocked = results.filter((r) => r.status === "blocked").length
  const passRate = ((passed / total) * 100).toFixed(1)

  let report = `# Test Execution Report\n\n`
  report += `## Summary\n`
  report += `- Total Tests: ${total}\n`
  report += `- Passed: ${passed}\n`
  report += `- Failed: ${failed}\n`
  report += `- Blocked: ${blocked}\n`
  report += `- Pass Rate: ${passRate}%\n\n`

  report += `## Test Results\n\n`
  results.forEach((result) => {
    const status = result.status === "pass" ? "✅" : result.status === "fail" ? "❌" : "⚠️"
    report += `${status} ${result.testCase} (${result.duration}ms)\n`
    if (result.error) {
      report += `   Error: ${result.error}\n`
    }
  })

  return report
}
