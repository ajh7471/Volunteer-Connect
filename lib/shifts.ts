import { supabase } from "./supabaseClient"
import { ymd } from "./date"
import type { AssignmentWithRelations } from "@/types/database"

export type ShiftWithCapacity = {
  id: string
  shift_date: string
  slot: "AM" | "MID" | "PM"
  start_time: string
  end_time: string
  capacity: number
  assignments_count: number
}

export type UserAssignment = {
  id: string
  shift_id: string
  shift_date: string
  slot: string
  start_time: string
  end_time: string
}

export type RecurrencePattern = "daily" | "weekly" | "biweekly" | "monthly"

export type RecurringSignupResult = {
  success: boolean
  signedUp: number
  skipped: number
  errors: string[]
}

const shiftCache = new Map<string, { data: ShiftWithCapacity[]; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds cache

export async function getMonthShifts(year: number, month: number, bypassCache = false): Promise<ShiftWithCapacity[]> {
  const cacheKey = `${year}-${month}`
  const cached = shiftCache.get(cacheKey)

  if (!bypassCache && cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const startDate = ymd(new Date(year, month, 1))
  const endDate = ymd(new Date(year, month + 1, 0))

  const [shiftsResult, assignmentsResult] = await Promise.all([
    supabase
      .from("shifts")
      .select("id, shift_date, slot, start_time, end_time, capacity")
      .gte("shift_date", startDate)
      .lte("shift_date", endDate)
      .order("shift_date", { ascending: true })
      .order("slot", { ascending: true }),
    supabase.from("shift_assignments").select("shift_id"),
  ])

  if (shiftsResult.error) {
    console.error("[v0] Error fetching month shifts:", shiftsResult.error)
    return []
  }

  const shifts = shiftsResult.data || []
  if (shifts.length === 0) {
    return []
  }

  const shiftIds = new Set(shifts.map((s: { id: string }) => s.id))

  // Create a map of shift_id -> count from assignments that match our shifts
  const assignmentCounts = new Map<string, number>()
  if (assignmentsResult.data) {
    assignmentsResult.data.forEach((a: { shift_id: string }) => {
      if (shiftIds.has(a.shift_id)) {
        const current = assignmentCounts.get(a.shift_id) || 0
        assignmentCounts.set(a.shift_id, current + 1)
      }
    })
  }

  const shiftsWithCounts = shifts.map(
    (shift: {
      id: string
      shift_date: string
      slot: "AM" | "MID" | "PM"
      start_time: string
      end_time: string
      capacity: number
    }) => ({
      ...shift,
      assignments_count: assignmentCounts.get(shift.id) || 0,
    }),
  )

  shiftCache.set(cacheKey, { data: shiftsWithCounts, timestamp: Date.now() })

  return shiftsWithCounts
}

export function invalidateShiftCache(year?: number, month?: number) {
  if (year !== undefined && month !== undefined) {
    shiftCache.delete(`${year}-${month}`)
  } else {
    shiftCache.clear()
  }
}

export async function signUpForShift(shiftId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) {
    return { success: false, error: "Error verifying user profile" }
  }

  if (!profile) {
    return {
      success: false,
      error: "User profile not found. Please contact an administrator to complete your registration.",
    }
  }

  // Check if already signed up
  const { data: existing } = await supabase
    .from("shift_assignments")
    .select("id")
    .eq("shift_id", shiftId)
    .eq("user_id", userId)
    .maybeSingle()

  if (existing) {
    return { success: false, error: "Already signed up for this shift" }
  }

  // Check capacity
  const { data: shift } = await supabase.from("shifts").select("capacity").eq("id", shiftId).single()

  const { count } = await supabase
    .from("shift_assignments")
    .select("id", { count: "exact", head: true })
    .eq("shift_id", shiftId)

  if (shift && count !== null && count >= shift.capacity) {
    return { success: false, error: "Shift is at full capacity" }
  }

  // Insert assignment
  const { error } = await supabase.from("shift_assignments").insert({ shift_id: shiftId, user_id: userId })

  if (error) {
    console.error("[v0] Error inserting shift assignment:", error)
    return { success: false, error: error.message }
  }

  // Invalidate cache for the shift's month
  const shiftDate = new Date(shiftId) // Assuming shiftId is a date string
  invalidateShiftCache(shiftDate.getFullYear(), shiftDate.getMonth() + 1)

  return { success: true }
}

export async function cancelShiftSignup(assignmentId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("shift_assignments").delete().eq("id", assignmentId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Invalidate cache for the shift's month
  const { data: assignment } = await supabase
    .from("shift_assignments")
    .select("shift_id")
    .eq("id", assignmentId)
    .single()

  if (assignment) {
    const shiftDate = new Date(assignment.shift_id) // Assuming shiftId is a date string
    invalidateShiftCache(shiftDate.getFullYear(), shiftDate.getMonth() + 1)
  }

  return { success: true }
}

export async function getUserAssignments(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<UserAssignment[]> {
  const { data, error } = await supabase
    .from("shift_assignments")
    .select(
      `
      id,
      shift_id,
      shifts (
        shift_date,
        slot,
        start_time,
        end_time
      )
    `,
    )
    .eq("user_id", userId)

  if (error || !data) {
    console.error("[v0] Error fetching user assignments:", error)
    return []
  }

  return (data as AssignmentWithRelations[])
    .filter((a) => {
      const date = a.shifts?.shift_date
      return date && date >= startDate && date <= endDate
    })
    .map((a) => ({
      id: a.id,
      shift_id: a.shift_id,
      shift_date: a.shifts!.shift_date,
      slot: a.shifts!.slot,
      start_time: a.shifts!.start_time,
      end_time: a.shifts!.end_time,
    }))
}

/**
 * Find all shifts matching the pattern of a given shift within a date range
 */
export async function findMatchingShifts(
  shiftId: string,
  startDate: string,
  endDate: string,
  recurrence: RecurrencePattern,
): Promise<{ id: string; shift_date: string; slot: string }[]> {
  // Get the original shift details
  const { data: originalShift, error: shiftError } = await supabase
    .from("shifts")
    .select("shift_date, slot, start_time, end_time")
    .eq("id", shiftId)
    .single()

  if (shiftError || !originalShift) {
    console.error("[v0] Error fetching original shift:", shiftError)
    return []
  }

  // Get all shifts in the date range with matching slot and times
  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("id, shift_date, slot")
    .eq("slot", originalShift.slot)
    .eq("start_time", originalShift.start_time)
    .eq("end_time", originalShift.end_time)
    .gte("shift_date", startDate)
    .lte("shift_date", endDate)
    .order("shift_date", { ascending: true })

  if (error || !shifts) {
    console.error("[v0] Error fetching matching shifts:", error)
    return []
  }

  // Filter shifts based on recurrence pattern
  const originalDate = new Date(originalShift.shift_date + "T00:00:00")
  const originalDayOfWeek = originalDate.getDay()
  const originalDayOfMonth = originalDate.getDate()

  return shifts.filter((shift) => {
    const shiftDate = new Date(shift.shift_date + "T00:00:00")

    switch (recurrence) {
      case "daily":
        return true

      case "weekly":
        return shiftDate.getDay() === originalDayOfWeek

      case "biweekly": {
        // Same day of week, every 2 weeks
        if (shiftDate.getDay() !== originalDayOfWeek) return false
        const diffTime = shiftDate.getTime() - originalDate.getTime()
        const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000))
        return diffWeeks % 2 === 0
      }

      case "monthly":
        // Same day of month (or closest available if not exact)
        return shiftDate.getDate() === originalDayOfMonth

      default:
        return false
    }
  })
}

/**
 * Sign up for multiple shifts at once (recurring signup)
 */
export async function signUpForRecurringShifts(
  shiftId: string,
  userId: string,
  recurrence: RecurrencePattern,
  endDate: string,
): Promise<RecurringSignupResult> {
  const result: RecurringSignupResult = {
    success: false,
    signedUp: 0,
    skipped: 0,
    errors: [],
  }

  // Get the original shift date as start
  const { data: originalShift, error: shiftError } = await supabase
    .from("shifts")
    .select("shift_date")
    .eq("id", shiftId)
    .single()

  if (shiftError || !originalShift) {
    result.errors.push("Could not find the selected shift")
    return result
  }

  // Find all matching shifts
  const matchingShifts = await findMatchingShifts(shiftId, originalShift.shift_date, endDate, recurrence)

  if (matchingShifts.length === 0) {
    result.errors.push("No matching shifts found in the selected date range")
    return result
  }

  // Get user's existing assignments
  const { data: existingAssignments } = await supabase
    .from("shift_assignments")
    .select("shift_id")
    .eq("user_id", userId)

  const existingShiftIds = new Set(existingAssignments?.map((a) => a.shift_id) || [])

  // Get capacity info for all shifts
  const shiftIds = matchingShifts.map((s) => s.id)
  const { data: shiftsCapacity } = await supabase.from("shifts").select("id, capacity").in("id", shiftIds)

  const { data: assignmentCounts } = await supabase
    .from("shift_assignments")
    .select("shift_id")
    .in("shift_id", shiftIds)

  const capacityMap = new Map(shiftsCapacity?.map((s) => [s.id, s.capacity]) || [])
  const countMap = new Map<string, number>()
  assignmentCounts?.forEach((a) => {
    countMap.set(a.shift_id, (countMap.get(a.shift_id) || 0) + 1)
  })

  // Filter out shifts user is already signed up for or that are full
  const shiftsToSignUp = matchingShifts.filter((shift) => {
    if (existingShiftIds.has(shift.id)) {
      result.skipped++
      return false
    }

    const capacity = capacityMap.get(shift.id) || 0
    const count = countMap.get(shift.id) || 0
    if (count >= capacity) {
      result.skipped++
      return false
    }

    return true
  })

  if (shiftsToSignUp.length === 0) {
    result.success = true
    result.errors.push("You are already signed up for all matching shifts or they are full")
    return result
  }

  // Bulk insert assignments
  const assignments = shiftsToSignUp.map((shift) => ({
    shift_id: shift.id,
    user_id: userId,
  }))

  const { error: insertError } = await supabase.from("shift_assignments").insert(assignments)

  if (insertError) {
    console.error("[v0] Error inserting recurring assignments:", insertError)
    result.errors.push("Failed to sign up for some shifts")
    return result
  }

  result.success = true
  result.signedUp = shiftsToSignUp.length

  // Invalidate all affected months
  const months = new Set(
    shiftsToSignUp.map((s) => {
      const d = new Date(s.shift_date + "T00:00:00")
      return `${d.getFullYear()}-${d.getMonth()}`
    }),
  )
  months.forEach((m) => {
    const [year, month] = m.split("-").map(Number)
    invalidateShiftCache(year, month)
  })

  return result
}

export function getCapacityStatus(
  capacity: number,
  assignmentsCount: number,
): "available" | "nearly-full" | "full" | "none" {
  if (capacity === 0) return "none"

  const percentFilled = (assignmentsCount / capacity) * 100

  if (percentFilled >= 100) return "full"
  if (percentFilled >= 50) return "nearly-full"
  return "available"
}
