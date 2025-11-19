"use server"

import { createClient } from "@/lib/supabase/server"

export type VolunteerData = {
  id: string
  name: string | null
  phone: string | null
  role: string | null
  email: string | null
  created_at: string
  active: boolean | null
  has_profile: boolean
  auth_email?: string
}

export async function getAllVolunteers(statusFilter: string = "all") {
  const supabase = await createClient()

  try {
    console.log("[v0] Server: Loading volunteers with filter:", statusFilter)

    // Fetch all profiles with proper filtering
    let profileQuery = supabase
      .from("profiles")
      .select("*")
      .order("name", { ascending: true })

    // Apply status filter to profiles query
    if (statusFilter === "active") {
      profileQuery = profileQuery.or("active.is.null,active.eq.true")
    } else if (statusFilter === "inactive") {
      profileQuery = profileQuery.eq("active", false)
    }

    const { data: profilesData, error: profilesError } = await profileQuery

    if (profilesError) {
      console.error("[v0] Server: Profiles fetch error:", profilesError)
      throw profilesError
    }

    console.log("[v0] Server: Profiles fetched:", profilesData?.length || 0)

    // Use server-side admin API to fetch auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error("[v0] Server: Auth users fetch error:", authError)
      // Don't throw, just return profiles without auth merge
      return {
        volunteers: profilesData || [],
        missingProfiles: 0
      }
    }

    console.log("[v0] Server: Auth users count:", authData?.users?.length || 0)

    // Create a map of profiles by user ID
    const profilesMap = new Map(
      (profilesData || []).map((p) => [p.id, p])
    )

    // Merge auth users with profiles
    const allUsers: VolunteerData[] = []
    let missingProfileCount = 0

    if (authData?.users) {
      for (const authUser of authData.users) {
        const profile = profilesMap.get(authUser.id)

        if (profile) {
          // User has a profile - apply status filter here too
          const shouldInclude =
            statusFilter === "all" ||
            (statusFilter === "active" && (profile.active === null || profile.active === true)) ||
            (statusFilter === "inactive" && profile.active === false)

          if (shouldInclude) {
            allUsers.push({
              ...profile,
              has_profile: true,
              auth_email: authUser.email
            })
          }
          profilesMap.delete(authUser.id)
        } else {
          // User exists in auth but has no profile
          missingProfileCount++
          
          // Only include if status filter allows (missing profiles are treated as active)
          if (statusFilter === "all" || statusFilter === "active") {
            allUsers.push({
              id: authUser.id,
              name: authUser.user_metadata?.name || null,
              phone: authUser.user_metadata?.phone || null,
              role: "volunteer",
              email: authUser.email || null,
              created_at: authUser.created_at,
              active: true,
              has_profile: false,
              auth_email: authUser.email
            })
          }
        }
      }
    }

    // Add any remaining profiles that don't have auth users
    profilesMap.forEach((profile) => {
      allUsers.push({
        ...profile,
        has_profile: true
      })
    })

    console.log("[v0] Server: Missing profiles:", missingProfileCount)
    console.log("[v0] Server: Total users returned:", allUsers.length)

    return {
      volunteers: allUsers,
      missingProfiles: missingProfileCount
    }
  } catch (error) {
    console.error("[v0] Server: Load volunteers error:", error)
    throw error
  }
}

export async function syncMissingProfiles() {
  const supabase = await createClient()

  try {
    // Fetch all auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) throw authError

    if (!authData?.users) {
      throw new Error("No auth users found")
    }

    // Fetch existing profiles
    const { data: existingProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id")

    if (profilesError) throw profilesError

    const existingProfileIds = new Set(
      (existingProfiles || []).map((p: { id: string }) => p.id)
    )

    // Find users without profiles
    const usersWithoutProfiles = authData.users.filter(
      (user) => !existingProfileIds.has(user.id)
    )

    console.log("[v0] Server: Users without profiles:", usersWithoutProfiles.length)

    if (usersWithoutProfiles.length === 0) {
      return {
        success: true,
        message: "All users already have profiles!",
        count: 0
      }
    }

    // Create profiles for users without them
    const newProfiles = usersWithoutProfiles.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split("@")[0] || "Unknown",
      phone: user.user_metadata?.phone || null,
      role: "volunteer",
      active: true,
      email_opt_in: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { error: insertError } = await supabase.from("profiles").insert(newProfiles)

    if (insertError) throw insertError

    return {
      success: true,
      message: `Successfully created ${newProfiles.length} missing profile(s)!`,
      count: newProfiles.length
    }
  } catch (error) {
    console.error("[v0] Server: Sync error:", error)
    throw error
  }
}
