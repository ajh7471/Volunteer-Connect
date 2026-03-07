import { createClient } from "@supabase/supabase-js"

/**
 * Script to create admin user for Volunteer Connect
 * Usage: npx tsx scripts/create-admin-user.ts
 *
 * Creates user: admin@vanderpumpdogs with password: Admin123
 * Sets role to 'admin' in profiles table
 */

async function createAdminUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("❌ Missing required environment variables:")
    console.error("  - NEXT_PUBLIC_SUPABASE_URL")
    console.error("  - SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  // Create admin client with service role (bypasses RLS)
  const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const email = "admin@vanderpumpdogs"
  const password = "Admin123"
  const adminName = "Admin User"

  try {
    console.log(`\n🔐 Creating admin user: ${email}`)

    // 1. Create auth user
    const { data: userData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    })

    if (authError) {
      console.error("❌ Failed to create auth user:", authError.message)
      process.exit(1)
    }

    if (!userData || !userData.user) {
      console.error("❌ No user data returned from auth creation")
      process.exit(1)
    }

    const userId = userData.user.id
    console.log(`✅ Auth user created with ID: ${userId}`)

    // 2. Create or update profile with admin role
    const { data: existingProfile, error: checkError } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single()

    let profileError
    if (existingProfile) {
      // Profile exists, update it to make it admin
      const { error: updateError } = await admin
        .from("profiles")
        .update({
          role: "admin",
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)

      profileError = updateError
    } else {
      // Profile doesn't exist, create it
      const { error: insertError } = await admin
        .from("profiles")
        .insert({
          id: userId,
          email,
          name: adminName,
          role: "admin",
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      profileError = insertError
    }

    if (profileError) {
      console.error("❌ Failed to create/update profile:", profileError.message)
      // Clean up the auth user if profile creation fails
      await admin.auth.admin.deleteUser(userId)
      process.exit(1)
    }

    console.log(`✅ Admin profile created/updated successfully`)
    console.log(`\n📋 Admin User Details:`)
    console.log(`   Email:    ${email}`)
    console.log(`   Password: ${password}`)
    console.log(`   Role:     admin`)
    console.log(`   User ID:  ${userId}`)
    console.log(`   Status:   Active\n`)

  } catch (error) {
    console.error("❌ Error creating admin user:", error)
    process.exit(1)
  }
}

createAdminUser()
