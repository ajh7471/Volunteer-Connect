import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing Supabase environment variables")
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey)

async function createAdminUser() {
  const email = "admin@vanderpumpdogs.org"
  const password = "Admin123"
  const adminName = "Admin"

  console.log(`🔄 Creating admin user with email ${email}...`)

  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error("❌ Failed to create auth user:", authError.message)
      process.exit(1)
    }

    const userId = authData.user.id
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
          email,
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
    console.log(`\n✅ Admin user created successfully!`)
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log(`   Role: admin`)
  } catch (error) {
    console.error("❌ Unexpected error:", error)
    process.exit(1)
  }
}

createAdminUser()
