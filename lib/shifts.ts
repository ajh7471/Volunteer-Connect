import { supabase } from "./supabaseClient"
import { ymd } from "./date"

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

export async function getMonthShifts(year: number, month: number): Promise<ShiftWithCapacity[]> {
  const startDate = ymd(new Date(year, month, 1))
  const endDate = ymd(new Date(year, month + 1, 0))

  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("id, shift_date, slot, start_time, end_time, capacity")
    .gte("shift_date", startDate)
    .lte("shift_date", endDate)
    .order("shift_date", { ascending: true })
    .order("slot", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching month shifts:", error)
    return []
  }

  // Get assignment counts for each shift using a proper select query
  const shiftsWithCounts = await Promise.all(
    (shifts || []).map(async (shift) => {
      const { data: assignments, error: assignmentError } = await supabase
        .from("shift_assignments")
        .select("id")
        .eq("shift_id", shift.id)

      if (assignmentError) {
        console.error("[v0] Error fetching assignments for shift:", shift.id, assignmentError)
      }

      const count = assignments?.length || 0

      console.log("[v0] Shift", shift.shift_date, shift.start_time, "- Count:", count, "Capacity:", shift.capacity)

      return {
        ...shift,
        assignments_count: count,
      }
    }),
  )

  return shiftsWithCounts
}

export async function signUpForShift(shiftId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  console.log("[v0] signUpForShift - shiftId:", shiftId, "userId:", userId)

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) {
    console.error("[v0] Error checking user profile:", profileError)
    return { success: false, error: "Error verifying user profile" }
  }

  if (!profile) {
    console.error("[v0] User profile not found for user_id:", userId)
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
  console.log("[v0] Inserting shift assignment - shift_id:", shiftId, "user_id:", userId)
  const { error } = await supabase.from("shift_assignments").insert({ shift_id: shiftId, user_id: userId })

  if (error) {
    console.error("[v0] Error inserting shift assignment:", error)
    return { success: false, error: error.message }
  }

  console.log("[v0] Successfully signed up for shift")
  return { success: true }
}

export async function cancelShiftSignup(assignmentId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("shift_assignments").delete().eq("id", assignmentId)

  if (error) {
    return { success: false, error: error.message }
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

  return data
    .filter((a: any) => {
      const date = a.shifts?.shift_date
      return date && date >= startDate && date <= endDate
    })
    .map((a: any) => ({
      id: a.id,
      shift_id: a.shift_id,
      shift_date: a.shifts.shift_date,
      slot: a.shifts.slot,
      start_time: a.shifts.start_time,
      end_time: a.shifts.end_time,
    }))
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
