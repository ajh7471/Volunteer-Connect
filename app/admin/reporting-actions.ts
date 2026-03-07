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

export type { ShiftFillRate, VolunteerAttendance }

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
 * Get attendance records for a volunteer in a date range.
 * Queries shift_assignments joined with shifts and profiles directly —
 * the volunteer_attendance view does not exist in the schema.
 */
export async function getVolunteerAttendance(
  volunteerId: string,
  startDate: string,
  endDate: string,
): Promise<{ success: boolean; data?: AttendanceRecord[]; error?: string }> {
  try {
    const { supabase } = await verifyAdminRole()

    const { data, error } = await supabase
      .from("shift_assignments")
      .select(`
        id,
        user_id,
        shifts(id, shift_date, start_time, end_time, slot),
        profiles(name, email)
      `)
      .eq("user_id", volunteerId)
      .gte("shifts.shift_date", startDate)
      .lte("shifts.shift_date", endDate)
      .order("created_at", { ascending: false })

    if (error) throw error

    const today = new Date().toISOString().split("T")[0]

    const records: AttendanceRecord[] = (data || [])
      .filter((a: any) => a.shifts)
      .map((a: any) => {
        const shift = a.shifts
        const profile = a.profiles
        const startH = parseInt(shift.start_time?.split(":")[0] ?? "0")
        const endH = parseInt(shift.end_time?.split(":")[0] ?? "0")
        const hours = Math.max(0, endH - startH)
        let status: "Completed" | "Today" | "Upcoming" = "Upcoming"
        if (shift.shift_date < today) status = "Completed"
        else if (shift.shift_date === today) status = "Today"
        return {
          assignment_id: a.id,
          volunteer_name: profile?.name || "Unknown",
          volunteer_email: profile?.email || "",
          shift_date: shift.shift_date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          slot: shift.slot,
          status,
          hours,
        }
      })

    return { success: true, data: records }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[v0] Get volunteer attendance error:", error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Calculate total hours for a volunteer.
 * Computed directly from shift_assignments + shifts — no RPC needed.
 */
export async function calculateVolunteerHours(
  volunteerId: string,
  startDate: string,
  endDate: string,
): Promise<{ success: boolean; data?: VolunteerHours; error?: string }> {
  try {
    const { supabase } = await verifyAdminRole()

    const { data, error } = await supabase
      .from("shift_assignments")
      .select("shifts(shift_date, start_time, end_time, slot)")
      .eq("user_id", volunteerId)
      .gte("shifts.shift_date", startDate)
      .lte("shifts.shift_date", endDate)

    if (error) throw error

    const breakdown: VolunteerHours["hours_breakdown"] = []
    let total = 0

    for (const a of data || []) {
      const shift = (a as any).shifts
      if (!shift) continue
      const startH = parseInt(shift.start_time?.split(":")[0] ?? "0")
      const endH = parseInt(shift.end_time?.split(":")[0] ?? "0")
      const h = Math.max(0, endH - startH)
      total += h
      breakdown.push({ date: shift.shift_date, slot: shift.slot, hours: h })
    }

    return {
      success: true,
      data: { total_hours: total, shift_count: breakdown.length, hours_breakdown: breakdown },
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[v0] Calculate volunteer hours error:", error)
    return { success: false, error: errorMessage }
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[v0] Get shift fill rates error:", error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Get aggregate shift statistics computed directly from shift_fill_rates view.
 * No RPC required — the view already has all fill data.
 */
export async function getShiftStatistics(
  startDate: string,
  endDate: string,
): Promise<{ success: boolean; data?: ShiftStatistics; error?: string }> {
  try {
    const { supabase } = await verifyAdminRole()

    const { data, error } = await supabase
      .from("shift_fill_rates")
      .select("capacity, filled_count, fill_status")
      .gte("shift_date", startDate)
      .lte("shift_date", endDate)

    if (error) throw error

    const rows = data || []
    const stats: ShiftStatistics = {
      total_shifts: rows.length,
      total_capacity: rows.reduce((s, r) => s + (r.capacity ?? 0), 0),
      total_filled: rows.reduce((s, r) => s + Number(r.filled_count ?? 0), 0),
      full_shifts: rows.filter((r) => r.fill_status === "Full").length,
      partial_shifts: rows.filter((r) => r.fill_status === "Partial").length,
      empty_shifts: rows.filter((r) => r.fill_status === "Empty").length,
      avg_fill_rate:
        rows.length === 0
          ? 0
          : Math.round(
              rows.reduce((s, r) => {
                const cap = r.capacity ?? 0
                const fill = Number(r.filled_count ?? 0)
                return s + (cap > 0 ? (fill / cap) * 100 : 0)
              }, 0) / rows.length,
            ),
    }

    return { success: true, data: stats }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[v0] Get shift statistics error:", error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Get popular time slots aggregated from shift_fill_rates view.
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

    const { data, error } = await supabase
      .from("shift_fill_rates")
      .select("slot, capacity, filled_count, fill_rate_percent")

    if (error) throw error

    // Group by slot client-side
    const map = new Map<string, { total: number; fills: number[]; volunteers: number }>()
    for (const row of data || []) {
      const entry = map.get(row.slot) ?? { total: 0, fills: [], volunteers: 0 }
      entry.total++
      entry.fills.push(Number(row.fill_rate_percent ?? 0))
      entry.volunteers += Number(row.filled_count ?? 0)
      map.set(row.slot, entry)
    }

    const result = Array.from(map.entries()).map(([slot, e]) => ({
      slot,
      total_shifts: e.total,
      avg_fill_rate: e.fills.length ? Math.round(e.fills.reduce((a, b) => a + b, 0) / e.fills.length) : 0,
      total_volunteers: e.volunteers,
    }))

    return { success: true, data: result }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[v0] Get popular time slots error:", error)
    return { success: false, error: errorMessage }
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

    const headers = ["Name", "Email", "Phone", "Role", "Status", "Joined Date"]
    const rows = data.map((v: {
      name: string | null
      email: string | null
      phone: string | null
      role: string | null
      active: boolean
      created_at: string | null
    }) => [
      v.name || "",
      v.email || "",
      v.phone || "",
      v.role || "",
      v.active ? "Active" : "Inactive",
      v.created_at ? new Date(v.created_at).toLocaleDateString() : "",
    ])

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    return { success: true, csv }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[v0] Export volunteers CSV error:", error)
    return { success: false, error: errorMessage }
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[v0] Export shift report CSV error:", error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Generate CSV content for attendance report.
 * Uses shift_assignments joined with shifts and profiles.
 */
export async function exportAttendanceCSV(
  volunteerId?: string,
  startDate?: string,
  endDate?: string,
): Promise<{ success: boolean; csv?: string; error?: string }> {
  try {
    const { supabase } = await verifyAdminRole()

    let query = supabase
      .from("shift_assignments")
      .select(`
        id,
        user_id,
        created_at,
        shifts(shift_date, start_time, end_time, slot),
        profiles(name, email)
      `)
      .order("created_at", { ascending: false })

    if (volunteerId) {
      query = query.eq("user_id", volunteerId)
    }
    if (startDate) {
      query = query.gte("shifts.shift_date", startDate)
    }
    if (endDate) {
      query = query.lte("shifts.shift_date", endDate)
    }

    const { data, error } = await query

    if (error) throw error

    const today = new Date().toISOString().split("T")[0]

    const headers = ["Volunteer Name", "Email", "Shift Date", "Time Slot", "Status", "Hours"]
    const rows = (data || [])
      .filter((a: any) => a.shifts)
      .map((a: any) => {
        const shift = a.shifts
        const profile = a.profiles
        const startH = parseInt(shift.start_time?.split(":")[0] ?? "0")
        const endH = parseInt(shift.end_time?.split(":")[0] ?? "0")
        const hours = Math.max(0, endH - startH)
        let status = "Upcoming"
        if (shift.shift_date < today) status = "Completed"
        else if (shift.shift_date === today) status = "Today"
        return [
          profile?.name || "Unknown",
          profile?.email || "",
          new Date(shift.shift_date).toLocaleDateString(),
          shift.slot,
          status,
          hours.toFixed(1),
        ]
      })

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    return { success: true, csv }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[v0] Export attendance CSV error:", error)
    return { success: false, error: errorMessage }
  }
}

// =====================================================
// DASHBOARD ANALYTICS
// =====================================================

/**
 * Get dashboard statistics.
 * Active-this-month count is derived from shift_assignments joined with shifts —
 * no RPC required.
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

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
    const today = now.toISOString().split("T")[0]

    const [volunteersResult, shiftsResult, assignmentsResult, activeResult] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "volunteer"),
      supabase.from("shifts").select("id", { count: "exact", head: true }),
      supabase.from("shift_assignments").select("id", { count: "exact", head: true }),
      supabase
        .from("shift_assignments")
        .select("user_id, shifts!inner(shift_date)", { count: "exact", head: true })
        .gte("shifts.shift_date", monthStart)
        .lte("shifts.shift_date", today),
    ])

    return {
      success: true,
      data: {
        totalVolunteers: volunteersResult.count || 0,
        totalShifts: shiftsResult.count || 0,
        totalAssignments: assignmentsResult.count || 0,
        activeThisMonth: activeResult.count || 0,
      },
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[v0] Get dashboard stats error:", error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Get recent activity feed from shift_assignments joined with shifts and profiles.
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
      .from("shift_assignments")
      .select(`
        id,
        created_at,
        shifts(shift_date, slot),
        profiles(name)
      `)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error

    return {
      success: true,
      data: (data || [])
        .filter((a: any) => a.shifts)
        .map((a: any) => ({
          id: a.id,
          type: "signup" as const,
          volunteer_name: a.profiles?.name || "Unknown",
          shift_date: a.shifts.shift_date,
          slot: a.shifts.slot,
          created_at: a.created_at,
        })),
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[v0] Get recent activity error:", error)
    return { success: false, error: errorMessage }
  }
}
