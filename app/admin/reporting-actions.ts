"use server"

/**
 * SERVER ACTIONS: REPORTING & ANALYTICS
 *
 * Admin-only server actions for generating reports, exporting data,
 * and calculating analytics for the volunteer management system.
 *
 * Features:
 * - Volunteer attendance tracking
 * - Shift fill rate statistics
 * - CSV/PDF export generation
 * - Dashboard analytics
 *
 * Security: All actions verify admin role before execution
 */

import { createClient } from "@/lib/supabase/server"
import { ShiftFillRate, VolunteerAttendance } from "@/types/database"

// =====================================================
// TYPES
// =====================================================

export type AttendanceRecord = {
  assignment_id: string
  volunteer_name: string
  volunteer_email: string
  shift_date: string
  start_time: string
  end_time: string
  slot: string
  status: "Completed" | "Today" | "Upcoming"
  hours: number
}

export type VolunteerHours = {
  total_hours: number
  shift_count: number
  hours_breakdown: Array<{
    date: string
    slot: string
    hours: number
  }>
}

export type ShiftStatistics = {
  total_shifts: number
  avg_fill_rate: number
  full_shifts: number
  partial_shifts: number
  empty_shifts: number
  total_capacity: number
  total_filled: number
}

// =====================================================
// AUTHORIZATION HELPER
// =====================================================

async function verifyAdminRole() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Not authenticated")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    throw new Error("Unauthorized: Admin role required")
  }

  return { supabase, userId: user.id }
}

// =====================================================
// VOLUNTEER ATTENDANCE
// =====================================================

/**
 * Get attendance records for a volunteer in a date range
 * Test Coverage: Test Case 1.1, 1.2
 */
export async function getVolunteerAttendance(
  volunteerId: string,
  startDate: string,
  endDate: string,
): Promise<{ success: boolean; data?: AttendanceRecord[]; error?: string }> {
  try {
    const { supabase } = await verifyAdminRole()

    const { data, error } = await supabase
      .from("volunteer_attendance")
      .select("*")
      .eq("user_id", volunteerId)
      .gte("shift_date", startDate)
      .lte("shift_date", endDate)
      .order("shift_date", { ascending: false })
      .order("start_time", { ascending: false })

    if (error) throw error

    return { success: true, data: data as AttendanceRecord[] }
  } catch (error: any) {
    console.error("[v0] Get volunteer attendance error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Calculate total hours for a volunteer
 * Test Coverage: Test Case 1.2
 */
export async function calculateVolunteerHours(
  volunteerId: string,
  startDate: string,
  endDate: string,
): Promise<{ success: boolean; data?: VolunteerHours; error?: string }> {
  try {
    const { supabase } = await verifyAdminRole()

    const { data, error } = await supabase.rpc("calculate_volunteer_hours", {
      p_user_id: volunteerId,
      p_start_date: startDate,
      p_end_date: endDate,
    })

    if (error) throw error

    return {
      success: true,
      data: data[0] || { total_hours: 0, shift_count: 0, hours_breakdown: [] },
    }
  } catch (error: any) {
    console.error("[v0] Calculate volunteer hours error:", error)
    return { success: false, error: error.message }
  }
}

// =====================================================
// SHIFT FILL RATES
// =====================================================

/**
 * Get shift fill rates for a date range
 * Test Coverage: Test Case 2.1
 */
export async function getShiftFillRates(
  startDate: string,
  endDate: string,
): Promise<{ success: boolean; data?: ShiftFillRate[]; error?: string }> {
  try {
    const { supabase } = await verifyAdminRole()

    const { data, error } = await supabase
      .from("shift_fill_rates")
      .select("*")
      .gte("shift_date", startDate)
      .lte("shift_date", endDate)
      .order("shift_date", { ascending: false })
      .order("start_time", { ascending: false })

    if (error) throw error

    return { success: true, data: data as ShiftFillRate[] }
  } catch (error: any) {
    console.error("[v0] Get shift fill rates error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get aggregate shift statistics
 * Test Coverage: Test Case 2.1
 */
export async function getShiftStatistics(
  startDate: string,
  endDate: string,
): Promise<{ success: boolean; data?: ShiftStatistics; error?: string }> {
  try {
    const { supabase } = await verifyAdminRole()

    const { data, error } = await supabase.rpc("get_shift_statistics", {
      p_start_date: startDate,
      p_end_date: endDate,
    })

    if (error) throw error

    return { success: true, data: data[0] || null }
  } catch (error: any) {
    console.error("[v0] Get shift statistics error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get popular time slots
 * Test Coverage: Test Case 2.3
 */
export async function getPopularTimeSlots(): Promise<{
  success: boolean
  data?: Array<{
    slot: string
    total_shifts: number
    avg_fill_rate: number
    total_volunteers: number
  }>
  error?: string
}> {
  try {
    const { supabase } = await verifyAdminRole()

    const { data, error } = await supabase.rpc("get_popular_time_slots")

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error("[v0] Get popular time slots error:", error)
    return { success: false, error: error.message }
  }
}

// =====================================================
// CSV EXPORT
// =====================================================

/**
 * Generate CSV content for volunteer list
 * Test Coverage: Test Case 3.1
 */
export async function exportVolunteersCSV(): Promise<{
  success: boolean
  csv?: string
  error?: string
}> {
  try {
    const { supabase } = await verifyAdminRole()

    const { data, error } = await supabase
      .from("profiles")
      .select("name, email, phone, role, active, created_at")
      .order("name")

    if (error) throw error

    // Generate CSV
    const headers = ["Name", "Email", "Phone", "Role", "Status", "Joined Date"]
    const rows = data.map((v) => [
      v.name || "",
      v.email || "",
      v.phone || "",
      v.role || "",
      v.active ? "Active" : "Inactive",
      v.created_at ? new Date(v.created_at).toLocaleDateString() : "",
    ])

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    return { success: true, csv }
  } catch (error: any) {
    console.error("[v0] Export volunteers CSV error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Generate CSV content for shift report
 * Test Coverage: Test Case 3.2
 */
export async function exportShiftReportCSV(
  startDate: string,
  endDate: string,
): Promise<{ success: boolean; csv?: string; error?: string }> {
  try {
    const { supabase } = await verifyAdminRole()

    const { data, error } = await supabase
      .from("shift_fill_rates")
      .select("*")
      .gte("shift_date", startDate)
      .lte("shift_date", endDate)
      .order("shift_date")
      .order("start_time")

    if (error) throw error

    const headers = ["Date", "Time Slot", "Capacity", "Filled", "Fill Rate %", "Status", "Volunteers"]
    const rows = (data as ShiftFillRate[]).map((s) => [
      new Date(s.shift_date).toLocaleDateString(),
      s.slot,
      s.capacity.toString(),
      s.filled_count.toString(),
      s.fill_rate_percent?.toString() || "0",
      s.fill_status,
      s.volunteer_names || "",
    ])

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    return { success: true, csv }
  } catch (error: any) {
    console.error("[v0] Export shift report CSV error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Generate CSV content for attendance report
 * Test Coverage: Test Case 3.3
 */
export async function exportAttendanceCSV(
  volunteerId?: string,
  startDate?: string,
  endDate?: string,
): Promise<{ success: boolean; csv?: string; error?: string }> {
  try {
    const { supabase } = await verifyAdminRole()

    let query = supabase.from("volunteer_attendance").select("*").order("shift_date", { ascending: false })

    if (volunteerId) {
      query = query.eq("user_id", volunteerId)
    }
    if (startDate) {
      query = query.gte("shift_date", startDate)
    }
    if (endDate) {
      query = query.lte("shift_date", endDate)
    }

    const { data, error } = await query

    if (error) throw error

    const headers = ["Volunteer Name", "Email", "Shift Date", "Time Slot", "Status", "Hours"]
    const rows = (data as VolunteerAttendance[]).map((a) => [
      a.volunteer_name || "",
      a.volunteer_email || "",
      new Date(a.shift_date).toLocaleDateString(),
      a.slot,
      a.status,
      a.hours?.toFixed(1) || "0",
    ])

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    return { success: true, csv }
  } catch (error: any) {
    console.error("[v0] Export attendance CSV error:", error)
    return { success: false, error: error.message }
  }
}

// =====================================================
// DASHBOARD ANALYTICS
// =====================================================

/**
 * Get dashboard statistics
 * Test Coverage: Test Case 5.1
 */
export async function getDashboardStats(): Promise<{
  success: boolean
  data?: {
    totalVolunteers: number
    totalShifts: number
    totalAssignments: number
    activeThisMonth: number
  }
  error?: string
}> {
  try {
    const { supabase } = await verifyAdminRole()

    // Run queries in parallel
    const [volunteersResult, shiftsResult, assignmentsResult, activeResult] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("shifts").select("id", { count: "exact", head: true }),
      supabase.from("shift_assignments").select("id", { count: "exact", head: true }),
      supabase.rpc("get_active_volunteers", {
        p_start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
        p_end_date: new Date().toISOString().split("T")[0],
        p_limit: 1000, // Get all to count
      }),
    ])

    return {
      success: true,
      data: {
        totalVolunteers: volunteersResult.count || 0,
        totalShifts: shiftsResult.count || 0,
        totalAssignments: assignmentsResult.count || 0,
        activeThisMonth: activeResult.data?.length || 0,
      },
    }
  } catch (error: any) {
    console.error("[v0] Get dashboard stats error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get recent activity feed
 * Test Coverage: Test Case 5.3
 */
export async function getRecentActivity(limit = 10): Promise<{
  success: boolean
  data?: Array<{
    id: string
    type: "signup" | "cancellation"
    volunteer_name: string
    shift_date: string
    slot: string
    created_at: string
  }>
  error?: string
}> {
  try {
    const { supabase } = await verifyAdminRole()

    const { data, error } = await supabase
      .from("volunteer_attendance")
      .select("assignment_id, volunteer_name, shift_date, slot, signed_up_at, status")
      .order("signed_up_at", { ascending: false })
      .limit(limit)

    if (error) throw error

    return {
      success: true,
      data:
        (data as VolunteerAttendance[])?.map((item) => ({
          id: item.assignment_id,
          type: "signup" as const,
          volunteer_name: item.volunteer_name,
          shift_date: item.shift_date,
          slot: item.slot,
          created_at: item.signed_up_at,
        })) || [],
    }
  } catch (error: any) {
    console.error("[v0] Get recent activity error:", error)
    return { success: false, error: error.message }
  }
}
