"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { EmailFilterCriteria } from "@/types/database"

/**
 * Send email to single or multiple recipients
 * TEST: Covers test cases 1.1, 1.2, 2.1
 */
export async function sendEmail(formData: {
  recipientIds: string[]
  emailType: string
  subject: string
  message: string
  templateId?: string
}) {
  const supabase = await createClient()

  // Verify admin role
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized: Admin access required")
  }

  // Get recipient details
  const { data: recipients } = await supabase
    .from("profiles")
    .select("id, email_opt_in")
    .in("id", formData.recipientIds)

  if (!recipients) throw new Error("No recipients found")

  // Filter only opted-in recipients (TEST: 1.3)
  const optedInRecipients = recipients.filter((r) => r.email_opt_in)

  if (optedInRecipients.length === 0) {
    throw new Error("No opted-in recipients found")
  }

  // Get emails from auth system
  const emailPromises = optedInRecipients.map(async (recipient) => {
    const { data: authUser } = await supabase.auth.admin.getUserById(recipient.id)

    if (!authUser.user?.email) return null

    // Log email (simulated sending)
    const { error } = await supabase.from("email_logs").insert({
      sent_by: user.id,
      recipient_id: recipient.id,
      recipient_email: authUser.user.email,
      email_type: formData.emailType,
      subject: formData.subject,
      status: "sent", // In production, this would be 'pending' then updated by email service
    })

    if (error) throw error
    return authUser.user.email
  })

  const sentEmails = (await Promise.all(emailPromises)).filter((email) => email !== null)

  revalidatePath("/admin/emails")

  return {
    success: true,
    count: sentEmails.length,
    message: `Email sent to ${sentEmails.length} recipient(s)`,
  }
}

/**
 * Create email template
 * TEST: Covers test case 3.1
 */
export async function createEmailTemplate(formData: {
  name: string
  category: string
  subject: string
  body: string
  variables: string[]
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized")
  }

  const { data, error } = await supabase
    .from("email_templates")
    .insert({
      name: formData.name,
      category: formData.category,
      subject: formData.subject,
      body: formData.body,
      variables: formData.variables,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath("/admin/emails/templates")
  return { success: true, data }
}

/**
 * Update email template
 * TEST: Covers test case 3.3
 */
export async function updateEmailTemplate(
  templateId: string,
  formData: {
    name?: string
    subject?: string
    body?: string
    active?: boolean
  },
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized")
  }

  const { error } = await supabase
    .from("email_templates")
    .update({
      ...formData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)

  if (error) throw error

  revalidatePath("/admin/emails/templates")
  return { success: true }
}

/**
 * Schedule email for future delivery
 * TEST: Covers test case 4.1
 */
export async function scheduleEmail(formData: {
  recipientIds: string[]
  emailType: string
  subject: string
  body: string
  scheduledFor: Date
  templateId?: string
  filterCriteria?: EmailFilterCriteria
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized")
  }

  // Verify scheduled time is in future
  if (new Date(formData.scheduledFor) <= new Date()) {
    throw new Error("Scheduled time must be in the future")
  }

  const { data, error } = await supabase
    .from("scheduled_emails")
    .insert({
      template_id: formData.templateId,
      subject: formData.subject,
      body: formData.body,
      email_type: formData.emailType,
      recipients: formData.recipientIds,
      filter_criteria: formData.filterCriteria,
      scheduled_for: formData.scheduledFor.toISOString(),
      status: "pending",
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath("/admin/emails")
  return { success: true, data }
}

/**
 * Cancel scheduled email
 * TEST: Covers test case 4.3
 */
export async function cancelScheduledEmail(scheduledEmailId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized")
  }

  const { error } = await supabase.from("scheduled_emails").update({ status: "cancelled" }).eq("id", scheduledEmailId)

  if (error) throw error

  revalidatePath("/admin/emails")
  return { success: true }
}

/**
 * Get volunteers filtered by email preferences
 * TEST: Covers test case 2.2
 */
export async function getFilteredVolunteers(category?: string) {
  const supabase = await createClient()

  const query = supabase.from("profiles").select("id, name, email_opt_in, email_categories").eq("email_opt_in", true)

  const { data: profiles } = await query

  if (!profiles) return []

  // Filter by category if specified
  let filtered = profiles
  if (category && category !== "all") {
    filtered = profiles.filter((p) => {
      const categories = p.email_categories || {}
      return categories[category] === true
    })
  }

  // Get emails from auth system
  const enrichedProfiles = await Promise.all(
    filtered.map(async (profile) => {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
      return {
        ...profile,
        email: authUser.user?.email || "",
      }
    }),
  )

  return enrichedProfiles
}

/**
 * Send bulk email to multiple recipients
 */
export async function sendBulkEmail(
  recipientIds: string[],
  subject: string,
  body: string,
  emailType: string
) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized: Admin access required")
  }

  // Get recipient details
  const { data: recipients } = await supabase
    .from("profiles")
    .select("id, email_opt_in")
    .in("id", recipientIds)

  if (!recipients) throw new Error("No recipients found")

  // Filter only opted-in recipients
  const optedInRecipients = recipients.filter((r) => r.email_opt_in)

  if (optedInRecipients.length === 0) {
    throw new Error("No opted-in recipients found")
  }

  // Get emails from auth system
  const emailPromises = optedInRecipients.map(async (recipient) => {
    const { data: authUser } = await supabase.auth.admin.getUserById(recipient.id)

    if (!authUser.user?.email) return null

    // Log email (simulated sending)
    const { error } = await supabase.from("email_logs").insert({
      sent_by: user.id,
      recipient_id: recipient.id,
      recipient_email: authUser.user.email,
      email_type: emailType,
      subject: subject,
      status: "sent", // In production, this would be 'pending' then updated by email service
    })

    if (error) throw error
    return authUser.user.email
  })

  const sentEmails = (await Promise.all(emailPromises)).filter((email) => email !== null)

  revalidatePath("/admin/emails")

  return {
    success: true,
    count: sentEmails.length,
    message: `Email sent to ${sentEmails.length} recipient(s)`,
  }
}
