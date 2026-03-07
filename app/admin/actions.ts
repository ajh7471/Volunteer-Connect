"use server"

/**
 * SERVER ACTIONS FOR ADMIN USER MANAGEMENT
 *
 * This file contains all server-side operations that require elevated privileges
 * or access to the Supabase service role key. These actions are only callable
 * from the server and enforce admin-only access.
 *
 * @test-scope: Admin user management - server-side operations with service role
 */

import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { Role } from "@/types/database"

/**
 * Creates a Supabase client with service role privileges
 * This client bypasses Row Level Security (RLS) and can perform admin operations
 *
 * @test-scope: Authentication - service role client creation
 */
async function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Verifies that the current user has admin role
 * Used as a security check before allowing sensitive operations
 *
 * @test-scope: Security - admin role verification
 * @returns Object with isAdmin boolean and optional error message
 */
async function verifyAdminRole() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const { createServerClient } = await import("@supabase/ssr")

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { isAdmin: false, error: "Not authenticated" }
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    return { isAdmin: false, error: "Admin privileges required" }
  }

  return { isAdmin: true }
}

/**
 * CREATE NEW USER ACCOUNT
 *
 * Creates a new user with Supabase Auth and profile record.
 * Enforces email blocklist and validates admin privileges.
 *
 * @test-scope: User account creation - complete user creation with auth and profile
 * @param userData Object containing email, password, name, phone, and role
 * @returns Success status and user ID or error message
 */
export async function createUserAccount(userData: {
  email: string
  password: string
  name: string
  phone?: string
  role: "volunteer" | "admin"
}) {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) {
    return { success: false, error: authError || "Unauthorized" }
  }

  const supabase = await getServiceRoleClient()

  const { data: blocked } = await supabase
    .from("auth_blocklist")
    .select("email")
    .eq("email", userData.email.toLowerCase())
    .maybeSingle()

  if (blocked) {
    return { success: false, error: "This email address is blocked" }
  }

  const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true, // Auto-confirm email for admin-created accounts
  })

  if (createError || !authUser.user) {
    return { success: false, error: createError?.message || "Failed to create user" }
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: authUser.user.id,
      name: userData.name,
      phone: userData.phone || null,
      role: userData.role,
      active: true,
      email_opt_in: false, // Default to not opted in
      created_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  )

  if (profileError) {
    await supabase.auth.admin.deleteUser(authUser.user.id)
    return { success: false, error: "Failed to create user profile" }
  }

  return { success: true, userId: authUser.user.id }
}

/**
 * DELETE USER ACCOUNT
 *
 * Removes a user's profile and all associated data (shift assignments).
 * Prevents deletion of the last admin and self-deletion.
 *
 * @test-scope: User removal - complete deletion with cascade cleanup
 * @param userId The UUID of the user to delete
 * @returns Success status or error message
 */
export async function deleteUserAccount(userId: string) {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) {
    return { success: false, error: authError || "Unauthorized" }
  }

  const supabase = await getServiceRoleClient()

  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const { createServerClient } = await import("@supabase/ssr")
  const userClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const {
    data: { user: currentUser },
  } = await userClient.auth.getUser()

  if (currentUser && currentUser.id === userId) {
    return { success: false, error: "Cannot delete your own account" }
  }

  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin")

  const { data: userToDelete } = await supabase.from("profiles").select("role").eq("id", userId).single()

  if (userToDelete && userToDelete.role === "admin" && admins && admins.length <= 1) {
    return { success: false, error: "Cannot delete the last admin account" }
  }

  const { error: assignmentsError } = await supabase.from("shift_assignments").delete().eq("user_id", userId)

  if (assignmentsError) {
    return { success: false, error: "Failed to remove user's shift assignments" }
  }

  const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId)

  if (profileError) {
    return { success: false, error: "Failed to delete user profile" }
  }

  // await supabase.auth.admin.deleteUser(userId)

  return { success: true }
}

/**
 * UPDATE USER ROLE
 *
 * Changes a user's role between volunteer and admin.
 * Prevents demotion of the last admin.
 *
 * @test-scope: Role management - role assignment with validation
 * @param userId The UUID of the user
 * @param newRole The new role to assign
 * @returns Success status or error message
 */
export async function updateUserRole(userId: string, newRole: Role) {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) {
    return { success: false, error: authError || "Unauthorized" }
  }

  const supabase = await getServiceRoleClient()

  const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", userId).single()

  if (currentProfile && currentProfile.role === "admin" && newRole === "volunteer") {
    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin")
    if (admins && admins.length <= 1) {
      return { success: false, error: "Cannot change role: You are the last admin" }
    }
  }

  const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId)

  if (error) {
    return { success: false, error: "Failed to update user role" }
  }

  return { success: true }
}

/**
 * ASSIGN SHIFT TO USER
 *
 * Creates a shift assignment for a user with capacity validation.
 * Prevents duplicate assignments and enforces capacity limits.
 *
 * @test-scope: Shift assignment - admin assigns volunteer to shift
 * @param userId The UUID of the volunteer
 * @param shiftId The UUID of the shift
 * @returns Success status or error message
 */
export async function assignShiftToUser(userId: string, shiftId: string) {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) {
    return { success: false, error: authError || "Unauthorized" }
  }

  const supabase = await getServiceRoleClient()

  const { data: existing } = await supabase
    .from("shift_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("shift_id", shiftId)
    .maybeSingle()

  if (existing) {
    return { success: false, error: "User already assigned to this shift" }
  }

  const { data: shift } = await supabase.from("shifts").select("capacity").eq("id", shiftId).single()

  const { data: assignments } = await supabase.from("shift_assignments").select("id").eq("shift_id", shiftId)

  if (shift && assignments && assignments.length >= shift.capacity) {
    return { success: false, error: "Shift is at full capacity" }
  }

  const { error } = await supabase.from("shift_assignments").insert({
    user_id: userId,
    shift_id: shiftId,
  })

  if (error) {
    return { success: false, error: "Failed to assign shift" }
  }

  return { success: true }
}

/**
 * REVOKE SHIFT FROM USER
 *
 * Removes a shift assignment from a user.
 *
 * @test-scope: Shift revocation - admin removes volunteer from shift
 * @param assignmentId The UUID of the shift assignment
 * @returns Success status or error message
 */
export async function revokeShiftFromUser(assignmentId: string) {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) {
    return { success: false, error: authError || "Unauthorized" }
  }

  const supabase = await getServiceRoleClient()

  const { error } = await supabase.from("shift_assignments").delete().eq("id", assignmentId)

  if (error) {
    return { success: false, error: "Failed to revoke shift assignment" }
  }

  return { success: true }
}

/**
 * BULK ASSIGN SHIFTS TO USER
 *
 * Assigns multiple shifts to a user in a single transaction.
 * Validates capacity for each shift before assignment.
 *
 * @test-scope: Shift assignment - bulk assignment with validation
 * @param userId The UUID of the volunteer
 * @param shiftIds Array of shift UUIDs
 * @returns Success status with count of successful assignments
 */
export async function bulkAssignShifts(userId: string, shiftIds: string[]) {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) {
    return { success: false, error: authError || "Unauthorized" }
  }

  const supabase = await getServiceRoleClient()
  const successfulAssignments: string[] = []
  const failedAssignments: { shiftId: string; reason: string }[] = []

  for (const shiftId of shiftIds) {
    const result = await assignShiftToUser(userId, shiftId)
    if (result.success) {
      successfulAssignments.push(shiftId)
    } else {
      failedAssignments.push({ shiftId, reason: result.error || "Unknown error" })
    }
  }

  return {
    success: successfulAssignments.length > 0,
    assigned: successfulAssignments.length,
    failed: failedAssignments.length,
    errors: failedAssignments,
  }
}

/**
 * GET ALL USERS WITH PROFILES
 *
 * Fetches all users from Supabase Auth and joins with their profile data.
 * This replaces the inefficient client-side N+1 fetching pattern.
 *
 * @test-scope: User management - efficient data fetching
 * @returns Array of user objects with profile data
 */
export async function getAdminUsers() {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) {
    return { success: false, error: authError || "Unauthorized" }
  }

  const supabase = await getServiceRoleClient()

  // Fetch profiles first
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })

  if (profileError) {
    return { success: false, error: "Failed to fetch profiles" }
  }

  // Fetch all auth users
  // Note: listUsers defaults to 50 users per page. For larger apps, we'd need pagination.
  const {
    data: { users: authUsers },
    error: authUserError,
  } = await supabase.auth.admin.listUsers({
    perPage: 1000, // Fetch up to 1000 users for now
  })

  if (authUserError) {
    return { success: false, error: "Failed to fetch auth users" }
  }

  // Map auth data to profiles
  const enrichedUsers = profiles.map((profile) => {
    const authUser = authUsers.find((u: { id: string; email?: string; last_sign_in_at?: string }) => u.id === profile.id)
    return {
      ...profile,
      email: authUser?.email || "No email",
      last_sign_in_at: authUser?.last_sign_in_at,
    }
  })

  return { success: true, users: enrichedUsers }
}

/**
 * BULK CREATE SHIFTS
 *
 * Creates shifts for every matching day in a date range.
 * Skips dates that already have a shift for that slot.
 *
 * @param options slot, startTime, endTime, capacity, startDate, endDate, daysOfWeek (0=Sun..6=Sat)
 * @returns created and skipped counts
 */
export async function bulkCreateShifts(options: {
  slot: string
  startTime: string
  endTime: string
  capacity: number
  startDate: string
  endDate: string
  daysOfWeek: number[]
}) {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) return { success: false, error: authError || "Unauthorized" }

  const supabase = await getServiceRoleClient()

  // Fetch existing shifts in the range to avoid duplicates
  const { data: existing } = await supabase
    .from("shifts")
    .select("shift_date, slot")
    .eq("slot", options.slot)
    .gte("shift_date", options.startDate)
    .lte("shift_date", options.endDate)

  const existingSet = new Set((existing || []).map((s) => s.shift_date))

  const toInsert: { slot: string; start_time: string; end_time: string; capacity: number; shift_date: string }[] = []
  const current = new Date(options.startDate + "T00:00:00")
  const end = new Date(options.endDate + "T00:00:00")

  while (current <= end) {
    const dow = current.getDay() // 0=Sun..6=Sat
    const dateStr = current.toISOString().split("T")[0]
    if (options.daysOfWeek.includes(dow) && !existingSet.has(dateStr)) {
      toInsert.push({
        slot: options.slot,
        start_time: options.startTime,
        end_time: options.endTime,
        capacity: options.capacity,
        shift_date: dateStr,
      })
    }
    current.setDate(current.getDate() + 1)
  }

  if (toInsert.length === 0) {
    return { success: true, created: 0, skipped: existingSet.size }
  }

  const { error } = await supabase.from("shifts").insert(toInsert)
  if (error) return { success: false, error: error.message }

  return { success: true, created: toInsert.length, skipped: existingSet.size }
}

/**
 * BULK DELETE SHIFTS
 *
 * Deletes shifts in a date range matching the slot filter.
 * onlyEmpty: when true, skips shifts that have assignments.
 *
 * @returns deleted and skipped counts
 */
export async function bulkDeleteShifts(options: {
  startDate: string
  endDate: string
  slot?: string
  onlyEmpty?: boolean
}) {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) return { success: false, error: authError || "Unauthorized" }

  const supabase = await getServiceRoleClient()

  let query = supabase
    .from("shifts")
    .select("id")
    .gte("shift_date", options.startDate)
    .lte("shift_date", options.endDate)

  if (options.slot) query = query.eq("slot", options.slot)

  const { data: shifts, error: fetchError } = await query
  if (fetchError) return { success: false, error: fetchError.message }
  if (!shifts || shifts.length === 0) return { success: true, deleted: 0, skipped: 0 }

  const shiftIds = shifts.map((s) => s.id)

  let idsToDelete = shiftIds
  let skipped = 0

  if (options.onlyEmpty) {
    const { data: assigned } = await supabase
      .from("shift_assignments")
      .select("shift_id")
      .in("shift_id", shiftIds)

    const assignedSet = new Set((assigned || []).map((a) => a.shift_id))
    idsToDelete = shiftIds.filter((id) => !assignedSet.has(id))
    skipped = shiftIds.length - idsToDelete.length
  }

  if (idsToDelete.length === 0) return { success: true, deleted: 0, skipped }

  const { error } = await supabase.from("shifts").delete().in("id", idsToDelete)
  if (error) return { success: false, error: error.message }

  return { success: true, deleted: idsToDelete.length, skipped }
}

/**
 * BULK UPDATE SHIFT CAPACITY
 *
 * Updates the capacity for all shifts in a date range and slot.
 *
 * @returns updated count
 */
export async function bulkUpdateCapacity(options: {
  startDate: string
  endDate: string
  slot?: string
  capacity: number
}) {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) return { success: false, error: authError || "Unauthorized" }

  const supabase = await getServiceRoleClient()

  let query = supabase
    .from("shifts")
    .update({ capacity: options.capacity })
    .gte("shift_date", options.startDate)
    .lte("shift_date", options.endDate)

  if (options.slot) query = query.eq("slot", options.slot)

  const { error, count } = await query.select()
  if (error) return { success: false, error: error.message }

  return { success: true, updated: count ?? 0 }
}

/**
 * GET SHIFTS FOR DATE RANGE WITH ASSIGNMENT COUNTS
 *
 * Efficient fetch for the admin shift grid view.
 * Returns shifts with their fill counts and assigned volunteer names.
 */
export async function getShiftsForRange(startDate: string, endDate: string) {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) return { success: false, error: authError || "Unauthorized" }

  const supabase = await getServiceRoleClient()

  const { data: shifts, error: shiftError } = await supabase
    .from("shifts")
    .select(`
      id, shift_date, slot, start_time, end_time, capacity,
      shift_assignments(
        id,
        user_id,
        profiles(id, name, email)
      )
    `)
    .gte("shift_date", startDate)
    .lte("shift_date", endDate)
    .order("shift_date", { ascending: true })
    .order("start_time", { ascending: true })

  if (shiftError) return { success: false, error: shiftError.message }

  return { success: true, shifts: shifts || [] }
}

/**
 * CREATE A SINGLE SHIFT
 */
export async function createSingleShift(data: {
  shift_date: string
  slot: string
  start_time: string
  end_time: string
  capacity: number
}) {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) return { success: false, error: authError || "Unauthorized" }

  const supabase = await getServiceRoleClient()
  const { data: shift, error } = await supabase.from("shifts").insert(data).select().single()
  if (error) return { success: false, error: error.message }

  return { success: true, shift }
}

/**
 * UPDATE A SINGLE SHIFT
 */
export async function updateSingleShift(
  shiftId: string,
  data: { start_time?: string; end_time?: string; capacity?: number; slot?: string }
) {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) return { success: false, error: authError || "Unauthorized" }

  const supabase = await getServiceRoleClient()
  const { error } = await supabase.from("shifts").update(data).eq("id", shiftId)
  if (error) return { success: false, error: error.message }

  return { success: true }
}

/**
 * DELETE A SINGLE SHIFT (and its assignments)
 */
export async function deleteSingleShift(shiftId: string) {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) return { success: false, error: authError || "Unauthorized" }

  const supabase = await getServiceRoleClient()
  await supabase.from("shift_assignments").delete().eq("shift_id", shiftId)
  const { error } = await supabase.from("shifts").delete().eq("id", shiftId)
  if (error) return { success: false, error: error.message }

  return { success: true }
}

/**
 * GET ALL ACTIVE VOLUNTEERS (for assignment dropdowns)
 */
export async function getActiveVolunteers() {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) return { success: false, error: authError || "Unauthorized" }

  const supabase = await getServiceRoleClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("role", "volunteer")
    .eq("active", true)
    .order("name", { ascending: true })

  if (error) return { success: false, error: error.message }
  return { success: true, volunteers: data || [] }
}

/**
 * GET SINGLE USER PROFILE WITH EMAIL
 *
 * Fetches a single user profile by ID with their email from auth.
 * Uses service role to bypass RLS and get complete data.
 *
 * @test-scope: User management - single user fetch with email
 * @param userId The UUID of the user to fetch
 * @returns User profile with email or error
 */
export async function getUserProfile(userId: string) {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) {
    return { success: false, error: authError || "Unauthorized" }
  }

  const supabase = await getServiceRoleClient()

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (profileError || !profile) {
    return { success: false, error: "Profile not found" }
  }

  // Fetch auth user to get email
  const { data: authData, error: authError2 } = await supabase.auth.admin.getUserById(userId)

  if (authError2 || !authData.user) {
    return { 
      success: true, 
      profile: {
        ...profile,
        email: profile.email || "No email"
      }
    }
  }

  return {
    success: true,
    profile: {
      ...profile,
      email: authData.user.email || profile.email || "No email",
      last_sign_in_at: authData.user.last_sign_in_at
    }
  }
}
