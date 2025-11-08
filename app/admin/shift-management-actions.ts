"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Feature #5: Advanced Shift Management Server Actions
 * Test Coverage: ADVANCED_SHIFT_MANAGEMENT_TDD_PLAN.md
 */

// ============================================
// 1. SHIFT TEMPLATES
// ============================================

/**
 * Create a new shift template
 * Test Coverage: RST-1.1
 */
export async function createShiftTemplate(formData: {
  name: string
  description?: string
  slot: string
  startTime: string
  endTime: string
  capacity: number
  recurrencePattern: string
  daysOfWeek: number[]
}) {
  const supabase = await createServerClient()

  // Verify admin role
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return { success: false, error: "Admin access required" }
  }

  // Create template
  const { data, error } = await supabase
    .from("shift_templates")
    .insert({
      name: formData.name,
      description: formData.description,
      slot: formData.slot,
      start_time: formData.startTime,
      end_time: formData.endTime,
      capacity: formData.capacity,
      recurrence_pattern: formData.recurrencePattern,
      days_of_week: formData.daysOfWeek,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath("/admin/shift-templates")
  return { success: true, data }
}

/**
 * Apply template to generate shifts for date range
 * Test Coverage: RST-1.2
 */
export async function applyShiftTemplate(templateId: string, startDate: string, endDate: string) {
  const supabase = await createServerClient()

  // Verify admin role
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return { success: false, error: "Admin access required" }
  }

  // Call database function to apply template
  const { data, error } = await supabase.rpc("apply_shift_template", {
    template_id_param: templateId,
    start_date_param: startDate,
    end_date_param: endDate,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath("/admin/shifts")
  revalidatePath("/calendar")
  return { success: true, shiftsCreated: data }
}

/**
 * Update shift template
 * Test Coverage: RST-1.3
 */
export async function updateShiftTemplate(
  templateId: string,
  updates: {
    name?: string
    description?: string
    capacity?: number
    daysOfWeek?: number[]
    active?: boolean
  },
) {
  const supabase = await createServerClient()

  // Verify admin role
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return { success: false, error: "Admin access required" }
  }

  const { error } = await supabase
    .from("shift_templates")
    .update({
      ...updates,
      days_of_week: updates.daysOfWeek,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/admin/shift-templates")
  return { success: true }
}

// ============================================
// 2. SHIFT WAITLIST
// ============================================

/**
 * Join waitlist for a full shift
 * Test Coverage: SWL-2.1
 */
export async function joinWaitlist(shiftId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  // Check if shift is full
  const { data: shift } = await supabase.from("shifts").select("capacity").eq("id", shiftId).single()

  const { count: assignmentCount } = await supabase
    .from("shift_assignments")
    .select("*", { count: "exact", head: true })
    .eq("shift_id", shiftId)

  if (!shift || (assignmentCount ?? 0) < shift.capacity) {
    return { success: false, error: "Shift is not full" }
  }

  // Check if already on waitlist
  const { data: existing } = await supabase
    .from("shift_waitlist")
    .select("id")
    .eq("shift_id", shiftId)
    .eq("user_id", user.id)
    .single()

  if (existing) {
    return { success: false, error: "Already on waitlist" }
  }

  // Get next position
  const { count: waitlistCount } = await supabase
    .from("shift_waitlist")
    .select("*", { count: "exact", head: true })
    .eq("shift_id", shiftId)
    .eq("status", "waiting")

  const position = (waitlistCount ?? 0) + 1

  // Join waitlist
  const { error } = await supabase.from("shift_waitlist").insert({
    shift_id: shiftId,
    user_id: user.id,
    position,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath("/calendar")
  revalidatePath("/my-schedule")
  return { success: true, position }
}

/**
 * Leave waitlist
 * Test Coverage: SWL-2.4
 */
export async function leaveWaitlist(waitlistId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  // Get waitlist entry
  const { data: entry } = await supabase.from("shift_waitlist").select("*").eq("id", waitlistId).single()

  if (!entry || entry.user_id !== user.id) {
    return { success: false, error: "Waitlist entry not found" }
  }

  // Remove from waitlist
  const { error } = await supabase.from("shift_waitlist").delete().eq("id", waitlistId)

  if (error) return { success: false, error: error.message }

  // Update positions for remaining waitlist
  await supabase
    .from("shift_waitlist")
    .update({ position: supabase.raw("position - 1") })
    .eq("shift_id", entry.shift_id)
    .gt("position", entry.position)

  revalidatePath("/calendar")
  revalidatePath("/my-schedule")
  return { success: true }
}

/**
 * Accept waitlist spot (convert to assignment)
 * Test Coverage: SWL-2.3
 */
export async function acceptWaitlistSpot(waitlistId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  // Get waitlist entry
  const { data: entry } = await supabase
    .from("shift_waitlist")
    .select("*")
    .eq("id", waitlistId)
    .eq("user_id", user.id)
    .single()

  if (!entry || entry.status !== "notified") {
    return { success: false, error: "Invalid waitlist entry or not notified" }
  }

  // Check if spot still available
  const { data: shift } = await supabase.from("shifts").select("capacity").eq("id", entry.shift_id).single()

  const { count: assignmentCount } = await supabase
    .from("shift_assignments")
    .select("*", { count: "exact", head: true })
    .eq("shift_id", entry.shift_id)

  if (!shift || (assignmentCount ?? 0) >= shift.capacity) {
    return { success: false, error: "Shift is now full" }
  }

  // Create assignment
  const { error: assignError } = await supabase.from("shift_assignments").insert({
    shift_id: entry.shift_id,
    user_id: user.id,
  })

  if (assignError) return { success: false, error: assignError.message }

  // Update waitlist status
  await supabase.from("shift_waitlist").update({ status: "converted" }).eq("id", waitlistId)

  // Process next person on waitlist
  await supabase.rpc("process_waitlist", { shift_id_param: entry.shift_id })

  revalidatePath("/calendar")
  revalidatePath("/my-schedule")
  return { success: true }
}

// ============================================
// 3. SHIFT SWAPPING
// ============================================

/**
 * Request a shift swap
 * Test Coverage: SSW-3.1
 */
export async function requestShiftSwap(assignmentId: string, targetUserId: string | null, message?: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  // Verify assignment belongs to requesting user
  const { data: assignment } = await supabase
    .from("shift_assignments")
    .select("*, shifts(*)")
    .eq("id", assignmentId)
    .single()

  if (!assignment || assignment.user_id !== user.id) {
    return { success: false, error: "Assignment not found or not yours" }
  }

  // Create swap request
  const { data, error } = await supabase
    .from("shift_swap_requests")
    .insert({
      original_assignment_id: assignmentId,
      requesting_user_id: user.id,
      target_user_id: targetUserId,
      shift_id: assignment.shift_id,
      message,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Notify target user if specified
  if (targetUserId) {
    await supabase.from("notification_queue").insert({
      user_id: targetUserId,
      shift_id: assignment.shift_id,
      notification_type: "shift_swap_request",
      subject: "Shift Swap Request",
      body: `A volunteer has requested to swap a shift with you. ${message || ""}`,
      scheduled_for: new Date().toISOString(),
    })
  }

  revalidatePath("/my-schedule")
  return { success: true, data }
}

/**
 * Accept shift swap
 * Test Coverage: SSW-3.2
 */
export async function acceptShiftSwap(swapRequestId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  // Get swap request
  const { data: swapRequest } = await supabase.from("shift_swap_requests").select("*").eq("id", swapRequestId).single()

  if (!swapRequest || (swapRequest.target_user_id && swapRequest.target_user_id !== user.id)) {
    return { success: false, error: "Swap request not found or not for you" }
  }

  // Update swap request
  const { error } = await supabase
    .from("shift_swap_requests")
    .update({
      status: "accepted",
      target_user_id: user.id, // Set target if it was open
      responded_at: new Date().toISOString(),
    })
    .eq("id", swapRequestId)

  if (error) return { success: false, error: error.message }

  // Notify requesting user and admin
  await supabase.from("notification_queue").insert([
    {
      user_id: swapRequest.requesting_user_id,
      shift_id: swapRequest.shift_id,
      notification_type: "shift_swap_accepted",
      subject: "Shift Swap Accepted",
      body: "Your shift swap request has been accepted. Pending admin approval.",
      scheduled_for: new Date().toISOString(),
    },
  ])

  revalidatePath("/my-schedule")
  revalidatePath("/admin/swap-requests")
  return { success: true }
}

/**
 * Admin approve shift swap
 * Test Coverage: SSW-3.3
 */
export async function adminApproveSwap(swapRequestId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return { success: false, error: "Admin access required" }
  }

  // Get swap request
  const { data: swapRequest } = await supabase.from("shift_swap_requests").select("*").eq("id", swapRequestId).single()

  if (!swapRequest || swapRequest.status !== "accepted") {
    return { success: false, error: "Invalid swap request" }
  }

  // Update original assignment
  const { error: updateError } = await supabase
    .from("shift_assignments")
    .update({ user_id: swapRequest.target_user_id })
    .eq("id", swapRequest.original_assignment_id)

  if (updateError) return { success: false, error: updateError.message }

  // Update swap request
  await supabase
    .from("shift_swap_requests")
    .update({
      status: "completed",
      admin_approved: true,
      admin_approved_by: user.id,
      admin_approved_at: new Date().toISOString(),
    })
    .eq("id", swapRequestId)

  // Notify both users
  await supabase.from("notification_queue").insert([
    {
      user_id: swapRequest.requesting_user_id,
      shift_id: swapRequest.shift_id,
      notification_type: "shift_swap_completed",
      subject: "Shift Swap Approved",
      body: "Your shift swap has been approved by admin.",
      scheduled_for: new Date().toISOString(),
    },
    {
      user_id: swapRequest.target_user_id,
      shift_id: swapRequest.shift_id,
      notification_type: "shift_swap_completed",
      subject: "Shift Swap Completed",
      body: "The shift swap has been completed.",
      scheduled_for: new Date().toISOString(),
    },
  ])

  revalidatePath("/admin/swap-requests")
  revalidatePath("/my-schedule")
  return { success: true }
}

/**
 * Decline shift swap
 * Test Coverage: SSW-3.4
 */
export async function declineShiftSwap(swapRequestId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { error } = await supabase
    .from("shift_swap_requests")
    .update({
      status: "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", swapRequestId)
    .eq("target_user_id", user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/my-schedule")
  return { success: true }
}

// ============================================
// 4. EMERGENCY COVERAGE
// ============================================

/**
 * Create emergency coverage request
 * Test Coverage: ECR-4.1
 */
export async function createEmergencyCoverage(
  shiftId: string,
  reason: string,
  urgency: string,
  expiresInHours: number,
) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return { success: false, error: "Admin access required" }
  }

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + expiresInHours)

  // Create coverage request
  const { data, error } = await supabase
    .from("emergency_coverage_requests")
    .insert({
      shift_id: shiftId,
      requested_by: user.id,
      reason,
      urgency,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Notify all eligible volunteers
  const { data: volunteers } = await supabase.from("profiles").select("id").eq("active", true).neq("role", "admin")

  if (volunteers) {
    const notifications = volunteers.map((v) => ({
      user_id: v.id,
      shift_id: shiftId,
      notification_type: "emergency_coverage",
      subject: `${urgency.toUpperCase()} - Emergency Shift Coverage Needed`,
      body: `We need urgent coverage for a shift. ${reason}. Please respond if you can help.`,
      scheduled_for: new Date().toISOString(),
    }))

    await supabase.from("notification_queue").insert(notifications)
  }

  revalidatePath("/admin/shifts")
  return { success: true, data }
}

/**
 * Claim emergency coverage shift
 * Test Coverage: ECR-4.2
 */
export async function claimEmergencyCoverage(coverageRequestId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  // Get coverage request
  const { data: coverage } = await supabase
    .from("emergency_coverage_requests")
    .select("*")
    .eq("id", coverageRequestId)
    .single()

  if (!coverage || coverage.status !== "open") {
    return { success: false, error: "Coverage request not available" }
  }

  // Create assignment
  const { error: assignError } = await supabase.from("shift_assignments").insert({
    shift_id: coverage.shift_id,
    user_id: user.id,
  })

  if (assignError) return { success: false, error: assignError.message }

  // Update coverage request
  await supabase
    .from("emergency_coverage_requests")
    .update({
      status: "filled",
      filled_by: user.id,
      filled_at: new Date().toISOString(),
    })
    .eq("id", coverageRequestId)

  // Notify admin
  await supabase.from("notification_queue").insert({
    user_id: coverage.requested_by,
    shift_id: coverage.shift_id,
    notification_type: "emergency_coverage_filled",
    subject: "Emergency Coverage Filled",
    body: "A volunteer has claimed the emergency coverage shift.",
    scheduled_for: new Date().toISOString(),
  })

  revalidatePath("/calendar")
  revalidatePath("/my-schedule")
  revalidatePath("/admin/shifts")
  return { success: true }
}

/**
 * Cancel emergency coverage request
 * Test Coverage: ECR-4.3
 */
export async function cancelEmergencyCoverage(coverageRequestId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return { success: false, error: "Admin access required" }
  }

  const { error } = await supabase
    .from("emergency_coverage_requests")
    .update({ status: "cancelled" })
    .eq("id", coverageRequestId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/admin/shifts")
  return { success: true }
}
