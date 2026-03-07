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

async function updateAdminEmail() {
  try {
    console.log("🔄 Updating admin user email to admin@vanderpumpdogs.org...")

    // Find the existing admin user with the old email
    const { data: users, error: listError } = await admin.auth.admin.listUsers()

    if (listError) {
      console.error("❌ Failed to list users:", listError.message)
      process.exit(1)
    }

    const adminUser = users.users.find((u) => u.email === "admin@vanderpumpdogs")

    if (!adminUser) {
      console.error("❌ Admin user not found with email admin@vanderpumpdogs")
      console.log("Available users:")
      users.users.forEach((u) => console.log(`  - ${u.email}`))
      process.exit(1)
    }

    const userId = adminUser.id

    // Update the user's email
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      email: "admin@vanderpumpdogs.org",
      email_confirm: true, // Auto-confirm the email
    })

    if (updateError) {
      console.error("❌ Failed to update user email:", updateError.message)
      process.exit(1)
    }

    console.log("✅ Admin email updated successfully")

    // Update the profile email as well
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        email: "admin@vanderpumpdogs.org",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (profileError) {
      console.error("⚠️ Warning: Failed to update profile email:", profileError.message)
      console.log("The auth email was updated, but the profile email may need manual update")
    } else {
      console.log("✅ Profile email updated successfully")
    }

    console.log("✨ Admin user email changed to admin@vanderpumpdogs.org")
  } catch (error) {
    console.error("❌ Unexpected error:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

updateAdminEmail()
