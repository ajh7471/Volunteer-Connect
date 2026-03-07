import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const email = "admin@vanderpumpdogs.org"
  const password = "Admin123"

  // 1. List all users and log them to debug
  const { data: listData, error: listError } = await admin.auth.admin.listUsers()
  if (listError) {
    console.error("Failed to list users:", listError.message)
    process.exit(1)
  }

  console.log("Total users found:", listData.users.length)
  listData.users.forEach((u) => {
    console.log(` - ${u.email} (${u.id})`)
  })

  // 2. Check if user already exists
  const existing = listData.users.find((u) => u.email === email)

  if (existing) {
    console.log("Found existing user, updating password...")
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: password,
      email_confirm: true,
    })
    if (error) {
      console.error("Failed to update:", error.message)
      process.exit(1)
    }
    console.log("Password updated for:", data.user.email)

    // Update profile role
    const { error: profileError } = await admin
      .from("profiles")
      .update({ role: "admin", active: true })
      .eq("id", existing.id)

    if (profileError) {
      console.log("Profile update note:", profileError.message)
    } else {
      console.log("Profile role set to admin")
    }
  } else {
    console.log("Creating new admin user...")
    const { data, error } = await admin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { name: "Admin", role: "admin" },
    })
    if (error) {
      console.error("Failed to create user:", error.message)
      process.exit(1)
    }
    console.log("Created user:", data.user.id)

    // Wait briefly for trigger to create profile
    await new Promise((r) => setTimeout(r, 2000))

    // Update profile role
    const { error: profileError } = await admin
      .from("profiles")
      .update({ role: "admin", active: true })
      .eq("id", data.user.id)

    if (profileError) {
      console.log("Profile update note:", profileError.message)
    } else {
      console.log("Profile role set to admin")
    }
  }

  console.log("")
  console.log("=== Admin credentials ===")
  console.log("Email:", email)
  console.log("Password:", password)
  console.log("=========================")
}

main()
