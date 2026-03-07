import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables")
  process.exit(1)
}

const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function resetAdminPassword() {
  console.log("🔄 Resetting admin password for admin@vanderpumpdogs.org...")

  try {
    // Get the user by email
    const { data: listData, error: listError } = await admin.auth.admin.listUsers()

    if (listError) {
      console.error("❌ Failed to list users:", listError.message)
      process.exit(1)
    }

    const adminUser = listData.users.find((user) => user.email === "admin@vanderpumpdogs.org")

    if (!adminUser) {
      console.error("❌ Admin user not found")
      process.exit(1)
    }

    console.log(`✅ Found admin user: ${adminUser.id}`)

    // Update the user's password
    const { data, error: updateError } = await admin.auth.admin.updateUserById(adminUser.id, {
      password: "Admin123",
      email_confirm: true,
    })

    if (updateError) {
      console.error("❌ Failed to update password:", updateError.message)
      process.exit(1)
    }

    console.log("✅ Admin password successfully reset to: Admin123")
    console.log(`✅ User email: admin@vanderpumpdogs.org`)
    console.log(`✅ You can now login with these credentials`)
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error)
    console.error("❌ Error resetting password:", err)
    process.exit(1)
  }
}

resetAdminPassword()
