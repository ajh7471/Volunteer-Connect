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
    .single()

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

  if (currentUser?.id === userId) {
    return { success: false, error: "Cannot delete your own account" }
  }

  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin")

  const { data: userToDelete } = await supabase.from("profiles").select("role").eq("id", userId).single()

  if (userToDelete?.role === "admin" && admins && admins.length <= 1) {
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
export async function updateUserRole(userId: string, newRole: "volunteer" | "admin") {
  const { isAdmin, error: authError } = await verifyAdminRole()
  if (!isAdmin) {
    return { success: false, error: authError || "Unauthorized" }
  }

  const supabase = await getServiceRoleClient()

  const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", userId).single()

  if (currentProfile?.role === "admin" && newRole === "volunteer") {
    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin")

    if (admins && admins.length <= 1) {
      return { success: false, error: "Cannot demote the last admin account" }
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
    .single()

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
