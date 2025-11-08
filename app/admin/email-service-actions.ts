"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Email Service Configuration Actions
 * Manages SendGrid and Gmail OAuth integration
 */

interface EmailServiceConfig {
  id?: string
  service_name: "sendgrid" | "gmail"
  is_active: boolean
  priority: number
  sendgrid_api_key?: string
  sendgrid_from_email?: string
  sendgrid_from_name?: string
  gmail_client_id?: string
  gmail_client_secret?: string
  gmail_refresh_token?: string
  gmail_from_email?: string
}

/**
 * Verify admin role for all service configuration actions
 */
async function verifyAdminRole() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    throw new Error("Unauthorized: Admin access required")
  }

  return { supabase, user }
}

/**
 * Save or update SendGrid configuration
 */
export async function saveSendGridConfig(formData: {
  apiKey: string
  fromEmail: string
  fromName: string
  isActive: boolean
  priority?: number
}) {
  const { supabase, user } = await verifyAdminRole()

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.fromEmail)) {
    throw new Error("Invalid email address format")
  }

  // Check if config exists
  const { data: existing } = await supabase
    .from("email_service_config")
    .select("id")
    .eq("service_name", "sendgrid")
    .single()

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from("email_service_config")
      .update({
        sendgrid_api_key: formData.apiKey,
        sendgrid_from_email: formData.fromEmail,
        sendgrid_from_name: formData.fromName,
        is_active: formData.isActive,
        priority: formData.priority || 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)

    if (error) throw error
  } else {
    // Insert new
    const { error } = await supabase.from("email_service_config").insert({
      service_name: "sendgrid",
      sendgrid_api_key: formData.apiKey,
      sendgrid_from_email: formData.fromEmail,
      sendgrid_from_name: formData.fromName,
      is_active: formData.isActive,
      priority: formData.priority || 1,
      created_by: user.id,
    })

    if (error) throw error
  }

  revalidatePath("/admin/settings/email-service")
  return { success: true, message: "SendGrid configuration saved successfully" }
}

/**
 * Save or update Gmail OAuth configuration
 */
export async function saveGmailConfig(formData: {
  clientId: string
  clientSecret: string
  refreshToken: string
  fromEmail: string
  isActive: boolean
  priority?: number
}) {
  const { supabase, user } = await verifyAdminRole()

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.fromEmail)) {
    throw new Error("Invalid email address format")
  }

  // Check if config exists
  const { data: existing } = await supabase
    .from("email_service_config")
    .select("id")
    .eq("service_name", "gmail")
    .single()

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from("email_service_config")
      .update({
        gmail_client_id: formData.clientId,
        gmail_client_secret: formData.clientSecret,
        gmail_refresh_token: formData.refreshToken,
        gmail_from_email: formData.fromEmail,
        is_active: formData.isActive,
        priority: formData.priority || 2,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)

    if (error) throw error
  } else {
    // Insert new
    const { error } = await supabase.from("email_service_config").insert({
      service_name: "gmail",
      gmail_client_id: formData.clientId,
      gmail_client_secret: formData.clientSecret,
      gmail_refresh_token: formData.refreshToken,
      gmail_from_email: formData.fromEmail,
      is_active: formData.isActive,
      priority: formData.priority || 2,
      created_by: user.id,
    })

    if (error) throw error
  }

  revalidatePath("/admin/settings/email-service")
  return { success: true, message: "Gmail configuration saved successfully" }
}

/**
 * Validate SendGrid API key by attempting to send a test email
 */
export async function validateSendGridConfig(configId: string) {
  const { supabase } = await verifyAdminRole()

  // Get config
  const { data: config } = await supabase
    .from("email_service_config")
    .select("sendgrid_api_key, sendgrid_from_email")
    .eq("id", configId)
    .single()

  if (!config) throw new Error("Configuration not found")

  try {
    // Attempt to validate via SendGrid API
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.sendgrid_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: config.sendgrid_from_email }],
            subject: "SendGrid Configuration Test",
          },
        ],
        from: { email: config.sendgrid_from_email },
        content: [
          {
            type: "text/plain",
            value: "This is a test email to validate your SendGrid configuration.",
          },
        ],
      }),
    })

    const isValid = response.status === 202 || response.status === 200

    // Update validation status
    await supabase
      .from("email_service_config")
      .update({
        is_validated: isValid,
        last_validated_at: new Date().toISOString(),
        validation_error: isValid ? null : `HTTP ${response.status}: ${await response.text()}`,
      })
      .eq("id", configId)

    revalidatePath("/admin/settings/email-service")

    if (isValid) {
      return { success: true, message: "SendGrid configuration validated successfully" }
    } else {
      throw new Error("SendGrid validation failed")
    }
  } catch (error: any) {
    // Update validation error
    await supabase
      .from("email_service_config")
      .update({
        is_validated: false,
        last_validated_at: new Date().toISOString(),
        validation_error: error.message,
      })
      .eq("id", configId)

    revalidatePath("/admin/settings/email-service")
    throw new Error(`Validation failed: ${error.message}`)
  }
}

/**
 * Validate Gmail OAuth configuration
 */
export async function validateGmailConfig(configId: string) {
  const { supabase } = await verifyAdminRole()

  // Get config
  const { data: config } = await supabase
    .from("email_service_config")
    .select("gmail_refresh_token, gmail_client_id, gmail_client_secret")
    .eq("id", configId)
    .single()

  if (!config) throw new Error("Configuration not found")

  try {
    // Attempt to refresh access token
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: config.gmail_client_id,
        client_secret: config.gmail_client_secret,
        refresh_token: config.gmail_refresh_token,
        grant_type: "refresh_token",
      }),
    })

    const data = await response.json()
    const isValid = response.ok && data.access_token

    // Update validation status and store new access token
    if (isValid) {
      const expiryDate = new Date()
      expiryDate.setSeconds(expiryDate.getSeconds() + data.expires_in)

      await supabase
        .from("email_service_config")
        .update({
          is_validated: true,
          last_validated_at: new Date().toISOString(),
          validation_error: null,
          gmail_access_token: data.access_token,
          gmail_token_expiry: expiryDate.toISOString(),
        })
        .eq("id", configId)
    } else {
      await supabase
        .from("email_service_config")
        .update({
          is_validated: false,
          last_validated_at: new Date().toISOString(),
          validation_error: data.error_description || "Invalid OAuth token",
        })
        .eq("id", configId)
    }

    revalidatePath("/admin/settings/email-service")

    if (isValid) {
      return { success: true, message: "Gmail configuration validated successfully" }
    } else {
      throw new Error("Gmail validation failed")
    }
  } catch (error: any) {
    await supabase
      .from("email_service_config")
      .update({
        is_validated: false,
        last_validated_at: new Date().toISOString(),
        validation_error: error.message,
      })
      .eq("id", configId)

    revalidatePath("/admin/settings/email-service")
    throw new Error(`Validation failed: ${error.message}`)
  }
}

/**
 * Toggle service active status
 */
export async function toggleServiceStatus(configId: string, isActive: boolean) {
  const { supabase } = await verifyAdminRole()

  const { error } = await supabase
    .from("email_service_config")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", configId)

  if (error) throw error

  revalidatePath("/admin/settings/email-service")
  return { success: true }
}

/**
 * Get all email service configurations
 */
export async function getEmailServiceConfigs() {
  const { supabase } = await verifyAdminRole()

  const { data, error } = await supabase.from("email_service_config").select("*").order("priority", { ascending: true })

  if (error) throw error

  return data || []
}

/**
 * Delete email service configuration
 */
export async function deleteEmailServiceConfig(configId: string) {
  const { supabase } = await verifyAdminRole()

  const { error } = await supabase.from("email_service_config").delete().eq("id", configId)

  if (error) throw error

  revalidatePath("/admin/settings/email-service")
  return { success: true, message: "Configuration deleted successfully" }
}
